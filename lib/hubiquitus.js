/**
 * @module hubiquitus
 * Actors container
 */

var _ = require("lodash");
var async = require("async");

var actors = require("./actors");
var discovery = require("./discovery");
var logger = require("./logger");
var utils = {
  aid: require("./utils/aid"),
  ip: require("./utils/ip"),
  uuid: require("./utils/uuid")
};

/**
 * @type {string}
 */
const ID = exports.ID = utils.uuid();

/**
 * @type {object}
 */
var netInfo = exports.netInfo = {};

/**
 * @type {string}
 */
var ip = utils.ip.resolve();

/**
 * @type {boolean}
 */
var started = false;

/**
 * @type {object}
 */
var adapters = {
  inproc: require("./adapters/inproc"),
  ipc: require("./adapters/ipc"),
  tcp: require("./adapters/tcp")
};

/**
 * Incomming message processing
 * @param message {object} message (hMessage)
 */
var onMessage = function (message) {
  logger.makeLog("trace", "hub-3", {msg: "message received", message: message});
  actors.get(message.actor).onMessage(message);
};
adapters.inproc.onMessage = onMessage;
adapters.ipc.onMessage = onMessage;
adapters.tcp.onMessage = onMessage;

/**
 * Starts container
 * @param params {object} parameters
 * @param cb {function} callback
 * @returns {object} module reference
 */
exports.start = function (params, cb) {
  logger.makeLog("trace", "hub-16", {msg: "starting container...", ID: ID});
  if (!started) {
    params = params || {};
    if (params.ip) ip = params.ip;
    async.series([
      startAdapters,
      function (done) {
        if (params.discoveryAddr) startDiscovery(params.discoveryAddr);
        netInfo = {ip: ip, pid: process.pid, ipc: adapters.ipc.addr, tcp: adapters.tcp.addr};
        logger.makeLog("info", "hub-18", {msg: "container started", ID: ID});
        started = true;
        if (_.isFunction(cb)) cb();
        done();
      }
    ]);
  } else {
    logger.makeLog("warn", "hub-17", {msg: "container already started !", ID: ID});
  }
  return this;
};

/**
 * Sends a message
 * @param from {string} sender aid
 * @param to {string} receiver aid
 * @param message {object} message (hMessage)
 * @param cb {function} callback
 * @returns {object} module reference
 */
exports.send = function (from, to, message, cb) {
  message.publisher = from;
  findActor(to, function (aid) {
    message.actor = aid;
    if (actors.get(aid).container.id === ID) {
      adapters.inproc.send(message);
      logger.makeLog("trace", "hub-2", {msg: "message sent inproc", message: message});
      if (_.isFunction(cb)) cb();
    }
  });
  return this;
};

/**
 * Adds an actor to the container
 * @param aid {string} aid
 * @param onMessage {function} actor handler
 * @param scope {object} optional scope
 * @returns {object} module reference
 */
exports.addActor = function (aid, onMessage, scope) {
  if (utils.aid.isBare(aid)) aid += "/" + utils.uuid();
  logger.makeLog("trace", "hub-1", {msg: "adding actor " + aid + "...", ID: ID});
  var actor = scope || {};
  actor.aid = aid;
  actor.container = {id: ID, netInfo: netInfo};
  actor.onMessage = onMessage.bind(actor);
  actor.send = function (to, message, cb) {
    exports.send(aid, to, message, cb);
  };
  actors.add(actor);
  return this;
};

/**
 * Removes an actor
 * @param aid {string} aid
 */
exports.removeActor = function (aid) {
  logger.makeLog("trace", "hub-4", {msg: "removing actor " + aid + "...", ID: ID});
  actors.remove(aid);
  return this;
};

/**
 * Finds an actor
 * @param reqAid {string} requested aid
 * @param {function} callback
 */
function findActor(reqAid, callback) {
  logger.makeLog("trace", "hub-10", {msg: "searching actor " + reqAid + "...", ID: ID});
  var aid = actors.pick(reqAid);
  if (aid) {
    logger.makeLog("trace", "hub-11", {msg: "actor " + reqAid + " found in cache !", ID: ID});
    process.nextTick(function () {
      callback(aid);
    }.bind(this));
  } else {
    logger.makeLog("trace", "hub-12", {msg: "actor " + reqAid + " not found, sending search request...", ID: ID});
    discovery.search(reqAid, callback);
  }
}

/**
 * Starts adapters
 * @param done {function} callback to invoke when all adapters are started
 */
function startAdapters(done) {
  logger.makeLog("trace", "hub-13", {msg: "starting adapters...", ID: ID});
  var tcpStarted = false;
  var ipcStarted = false;
  adapters.ipc.start(function () {
    logger.makeLog("trace", "hub-14", {msg: "ipc adapter started", ID: ID});
    ipcStarted = true;
    if (ipcStarted && tcpStarted) done();
  });
  adapters.tcp.start(function () {
    logger.makeLog("trace", "hub-15", {msg: "tcp adapter started", ID: ID});
    tcpStarted = true;
    if (ipcStarted && tcpStarted) done();
  });
}
