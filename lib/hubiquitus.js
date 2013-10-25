/**
 * @module hubiquitus
 * Actors container
 */

var _ = require("lodash");

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
var adapters = {
  inproc: require("./adapters/inproc"),
  ipc: require("./adapters/ipc")
};

/**
 * @type {string}
 */
var ip = utils.ip.resolve();

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

/**
 * Starts container
 * @param params {object} parameters
 * @returns {object} module reference
 */
exports.start = function (params) {
  params = params || {};
  if (params.ip) ip = params.ip;
  if (params.discoveryAddr) startDiscovery(params.discoveryAddr);
  adapters.ipc.start();
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
  actor.container = {id: ID};
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
