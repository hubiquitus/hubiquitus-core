/**
 * @module hubiquitus
 * Actors container
 */

var _ = require("lodash");
var timers = require("timers");
var EventEmitter = require("events").EventEmitter;
var actors = require("./actors");
var discovery = require("./discovery");
var logger = require("./logger");
var stats = require("./stats");
var utils = {
  aid: require("./utils/aid"),
  ip: require("./utils/ip"),
  uuid: require("./utils/uuid")
};

/**
 * @type {object}
 */
const _this = module.exports;

/**
 * @type {string}
 */
const ID = exports.ID = utils.uuid();

/**
 * @type {object}
 */
exports.netInfo = {
  ip: utils.ip.resolve()
};

/**
 * @type {boolean}
 */
var started = false;

/**
 * @type {boolean}
 */
var traceStats = false;

/**
 * @type {Array}
 */
var startingQueue = [];

/**
 * @type {number}
 */
var defaultSendTimeout = 30000;

/**
 * @type {EventEmitter}
 */
var events = new EventEmitter();

/**
 * @type {object}
 */
var adapters = {
  inproc: require("./adapters/inproc"),
  remote: require("./adapters/remote")
};
adapters.inproc.events.on("message", onMessage);
adapters.inproc.events.on("response", onResponse);
adapters.remote.events.on("message", onMessage);
adapters.remote.events.on("response", onResponse);
adapters.remote.events.on("drop", onDrop);

/**
 * Starts container
 * @param params {object} parameters
 * @param cb {function} callback
 * @returns {object} module reference
 */
exports.start = function (params, cb) {
  logger.makeLog("trace", "hub-16", "starting container...");
  if (!started) {
    params = params || {};
    exports.netInfo.pid = process.pid;
    if (params.ip) exports.netInfo.ip = params.ip;
    if (params.defaultSendTimeout) defaultSendTimeout = params.defaultSendTimeout;
    if (traceStats = (params.stats === "on")) timers.setImmediate(stats.start);
    adapters.remote.start(function (err) {
      if (!err) {
        exports.netInfo.port = adapters.remote.port;
        if (params.discoveryAddr || params.discoveryPort) {
          discovery.start(params.discoveryAddr, params.discoveryPort, function () {
            logger.makeLog("trace", "hub-22", "discovery started !");
          });
        }
      } else {
        logger.makeLog("trace", "hub-24", "no tcp adapter : discovery disabled");
      }
      logger.makeLog("info", "hub-18", "container started !", {netInfo: exports.netInfo});
      started = true;
      if (_.isFunction(cb)) setImmediate(cb);
      setImmediate(processStartingQueue);
    });
  } else {
    logger.makeLog("warn", "hub-17", "container already started !");
  }
  return this;
};

/**
 * Sends a message
 * @param from {string} sender aid
 * @param to {string} receiver aid
 * @param content {object} message
 * @param timeout {number} timeout
 * @param cb {function} callback
 * @returns {object} module reference
 */
exports.send = function (from, to, content, timeout, cb) {
  if (started) {
    var message = {from: from, to: to, payload: {content: content}, id: utils.uuid(), date: new Date().getTime()};
    if (_.isFunction(timeout)) { cb = timeout; timeout = defaultSendTimeout; }
    if (timeout) message.timeout = timeout;
    if (_.isFunction(cb)) {
      events.once("response|" + message.id, function (err, response) {
        return err ? cb(err) : cb(response.payload.err, response.from, response.payload.content);
      });
      setTimeout(function () {
        events.emit("response|" + message.id, "TIMEOUT");
      }, message.timeout);
    }
    internalSend(message, timeout);
  } else {
    startingQueue.push({from: from, to: to, content: content, timeout: timeout, cb: cb});
  }
  return this;
};

/**
 * Internal send : find actor & send message
 * @param message {object} formated message to be sent
 */
function internalSend(message) {
  findActor(message.to, function (aid) {
    if (!message.timeout || new Date().getTime() < (message.date + message.timeout)) {
      message.to = aid;
      var scope = actors.getScope(aid);
      var actor = actors.get(aid);
      if (scope === actors.scope.PROCESS) {
        logger.makeLog("trace", "hub-2", "sending message inproc...", {message: message});
        adapters.inproc.send(message);
      } else if (scope === actors.scope.REMOTE) {
        logger.makeLog("trace", "hub-15", "sending message to another container...", {message: message});
        adapters.remote.send(actor.container, message);
      }
      if (traceStats) setImmediate(stats.count, message.from, message.to);
    }
  });
}

/**
 * Incomming message processing
 * @param message {object} message (hMessage)
 * @param cb {function}
 */
function onMessage(message, cb) {
  logger.makeLog("trace", "hub-3", "processing message", {message: message});
  var actor = actors.get(message.to, actors.scope.PROCESS);
  if (!actor) {
    logger.makeLog("error", "hub-22", "actor " + message.to + " not found");
  } else {
    setImmediate(function () {
      actor.onMessage(message.from, message.payload.content, message.date, function (err, content) {
        var response = {from: actor.id, to: message.from, payload: {err: err, content: content}, id: message.id};
        cb(response);
      });
    });
  }
}

/**
 * Incomming response processing
 * @param response {object} formated response (message)
 */
function onResponse(response) {
  logger.makeLog("trace", "hub-25", "processing response", {response: response});
  events.emit("response|" + response.id, null, response);
}

/**
 * Message drop handler
 * @param message {object} message to be processed
 */
function onDrop(message) {
  logger.makeLog("trace", "hub-26", "message " + message.id + " dropped");
  if (!message.timeout || new Date().getTime() < (message.date + message.timeout)) {
    logger.makeLog("trace", "hub-27", "resending message " + message.id);
    internalSend(message);
  } else {
    logger.makeLog("trace", "hub-28", "timeout reached, " + message.id + " definitely dropped");
  }
}

/**
 * Adds an actor to the container
 * @param aid {string} aid
 * @param onMessage {function} actor handler
 * @param [scope] {object} scope
 * @returns {object} module reference
 */
exports.addActor = function (aid, onMessage, scope) {
  if (utils.aid.isBare(aid)) aid += "/" + utils.uuid();
  logger.makeLog("trace", "hub-1", "adding actor " + aid + "...");
  var actor = scope || {};
  actor.id = aid;
  actor.container = {id: ID, netInfo: exports.netInfo};
  actor.onMessage = onMessage.bind(actor);
  actor.send = function (to, content, timeout, cb) {
    exports.send(aid, to, content, timeout, cb);
  };
  actors.add(actor);
  return this;
};

/**
 * Removes an actor
 * @param aid {string} aid
 */
exports.removeActor = function (aid) {
  logger.makeLog("trace", "hub-4", "removing actor " + aid + "...");
  actors.remove(aid);
  return this;
};

/**
 * Finds an actor
 * @param reqAid {string} requested aid
 * @param {function} callback
 */
function findActor(reqAid, callback) {
  logger.makeLog("trace", "hub-10", "searching actor " + reqAid + "...");
  var aid = actors.pick(reqAid);
  if (aid) {
    logger.makeLog("trace", "hub-11", "actor " + reqAid + " found in cache !");
    setImmediate(callback, aid);
  } else {
    logger.makeLog("trace", "hub-12", "actor " + reqAid + " not found, sending search request...");
    discovery.search(reqAid, callback);
  }
}

/**
 * Sends starting queue messages
 */
function processStartingQueue() {
  logger.makeLog("trace", "hub-19", "processing starting queue (" + startingQueue.length + " items)");
  _.forEach(startingQueue, function (message) {
    setImmediate(exports.send, message.from, message.to, message.content, message.cb);
  });
  startingQueue = [];
}

/**
 * Set hubiquitus properties
 * @param key
 * @param value
 */
exports.set = function (key, value) {
  if (key === "discoveryAddrs") {
    discovery.set(key, value);
  }
};

/**
 * Schedule the immediate execution of the callback after I/O events
 * @param {function} callback
 */
function setImmediate(callback) {
  if (!callback) throw new Error("callback is undefined");
  var args = Array.prototype.slice.call(arguments, 1);
  timers.setImmediate(function () {
    callback.apply(_this, args);
  });
}
