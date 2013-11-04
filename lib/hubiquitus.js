/**
 * @module hubiquitus
 * Actors container
 */

var _ = require("lodash");
var async = require("async");
var timers = require("timers");

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
 * @type {object}
 */
var adapters = {
  inproc: require("./adapters/inproc"),
  ipc: require("./adapters/ipc"),
  tcp: require("./adapters/tcp"),
  utils: {
    zmq: require("./adapters/utils/zmq")
  }
};

/**
 * Incomming message processing
 * @param message {object} message (hMessage)
 * @param cb {function}
 */
var onMessage = function (message, cb) {
  logger.makeLog("trace", "hub-3", "message received", {message: message});
  var actor = actors.get(message.to, actors.scope.PROCESS);
  if (!actor) {
    logger.makeLog("error", "hub-22", "actor " + message.to + " not found");
  } else {
    setImmediate(actor.onMessage, message, cb);
  }
};
adapters.inproc.onMessage = onMessage;
adapters.ipc.onMessage = onMessage;
adapters.tcp.onMessage = onMessage;
adapters.utils.zmq.onMessage = onMessage;

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
    if (params.ip) exports.netInfo.ip = params.ip;
    if (params.defaultSendTimeout) defaultSendTimeout = params.defaultSendTimeout;
    if (traceStats = (params.stats === "on")) timers.setImmediate(stats.start);
    startAdapters(function () {
      if (params.discoveryAddr) discovery.start(params.discoveryAddr, function () {
        logger.makeLog("trace", "hub-22", "discovery started !");
      });
      collectNetInfo();
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
  //TODO Add timeout & response support
  var date = new Date().getTime();
  if (started) {
    if (_.isFunction(timeout)) {
      cb = timeout;
      timeout = defaultSendTimeout;
    }
    findActor(to, function (aid) {
      if (!timeout || new Date().getTime() < (date + timeout)) {
        var message = {from: from, to: aid, content: content, id: utils.uuid()};
        var scope = actors.getScope(aid);
        var actor = actors.get(aid);
        if (scope === actors.scope.PROCESS) {
          logger.makeLog("trace", "hub-2", "sending message inproc...", {message: message});
          adapters.inproc.send(message);
        } else if (scope  === actors.scope.LOCAL) {
          logger.makeLog("trace", "hub-14", "sending message ipc...", {message: message});
          adapters.ipc.send(actor.container, message);
        } else if (scope === actors.scope.REMOTE) {
          logger.makeLog("trace", "hub-15", "sending message tcp...", {message: message});
          adapters.tcp.send(actor.container, message);
        }
        if (traceStats) setImmediate(stats.count, from, to);
      }
    });
  } else {
    startingQueue.push({from: from, to: to, content: content, timeout: timeout, cb: cb});
  }
  return this;
};

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
 * Starts adapters
 * @param done {function} callback to invoke when all adapters are started
 */
function startAdapters(done) {
  logger.makeLog("trace", "hub-13", "starting adapters...");
  async.parallel([
    adapters.ipc.start,
    adapters.tcp.start
  ], done.bind(_this));
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
 * Collects container network information
 */
function collectNetInfo() {
  exports.netInfo.pid = process.pid;
  exports.netInfo.ipc = adapters.ipc.addr;
  exports.netInfo.tcp = adapters.tcp.addr;
}

/**
 * Schedule the immediate execution of the callback after I/O events
 * @param {function} callback
 */
function setImmediate(callback) {
  if (!callback) throw new Error("callback is undefined");
  var args = Array.prototype.slice.call(arguments, 1);
  timers.setImmediate(function() {
    callback.apply(_this, args);
  });
}
