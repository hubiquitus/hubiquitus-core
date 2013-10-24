/**
 * @module hubiquitus
 * Actors container
 */

var _ = require("lodash");
var zmq = require("zmq");
var EventEmitter = require("events").EventEmitter;

var logger = require("./logger");
var utils = {
  aid: require("./utils/aid"),
  ip: require("./utils/ip"),
  uuid: require("./utils/uuid")
};

/**
 * @type {string}
 */
const ID = utils.uuid();

/**
 * @type {EventEmitter}
 */
var events = new EventEmitter();

/**
 * @type {Socket}
 */
var pubDiscovery = zmq.socket("pub");

/**
 * @type {Socket}
 */
var subDiscovery = zmq.socket("sub");

/**
 * @type {object}
 */
var adapters = {
  inproc: require("./adapters/inproc")
};

/**
 * @type {object}
 */
var actors = {};

/**
 * @type {string}
 */
exports.ip = utils.ip.resolve();

/**
 * Incomming message processing
 * @param message {object} message (hMessage)
 */
var onMessage = function (message) {
  logger.makeLog("trace", "hub-3", {msg: "message received", message: message});
  actors[message.actor].onMessage(message);
};
adapters.inproc.onMessage = onMessage;

/**
 * Sends a message
 * @param sender {string} sender aid
 * @param receiver {string} receiver aid
 * @param message {object} message (hMessage)
 * @param cb {function} callback
 * @returns module reference
 */
exports.send = function (sender, receiver, message, cb) {
  message.publisher = sender;
  message.actor = receiver;
  logger.makeLog("trace", "hub-2", {msg: "message sent", message: message});
  adapters.inproc.send(message);
  if (_.isFunction(cb)) cb();
  return module.exports;
};

/**
 * Adds an actor to the container
 * @param aid {string} actor id
 * @param onMessage {function} actor handler
 * @returns module reference
 */
exports.addActor = function (aid, onMessage) {
  if (utils.aid.isBare(aid)) aid += "/" + utils.uuid();
  logger.makeLog("trace", "hub-1", {msg: "actor added", actor: aid});
  var actor = {aid: aid};
  actor.onMessage = onMessage.bind(actor);
  actor.send = function (to, message, cb) {
    exports.send(aid, to, message, cb);
  };
  actors[actor.aid] = actor;
  return module.exports;
};

/**
 * Removes an actor
 * @param aid {string} actor id
 */
exports.removeActor = function (aid) {
  logger.makeLog("trace", "hub-4", {msg: "actor removed", actor: aid});
  delete actors[aid];
};

/**
 * Starts containers discovery
 * @param {string} addr
 */
function startDiscovery(addr) {
  pubDiscovery.bind(addr, function (err) {
    if (err) logger.makeLog("err", "hub-5", {ID: ID, err: err});
  });
  subDiscovery.connect(addr, function (err) {
    if (err) logger.makeLog("err", "hub-6", {ID: ID, err: err});
  });
  subDiscovery.subscribe("").on("message", onDiscoveryMessage);
}

/**
 * Discovery message handler
 * @param {Buffer} buffer
 */
function onDiscoveryMessage(buffer) {
  if (!buffer || !buffer.length) return;

  var message = JSON.parse(buffer.toString());
  if (message.type === "search" && message.from !== ID) {
    logger.makeLog("debug", "hub-7", {msg: "search request for actor " + message.aid + " received", ID: ID});
    //TODO handle bare/full aid (if bare : pick random bare-matching full)
    var actor = actors[message.aid];
    if (actor) {
      logger.makeLog("debug", "hub-8", {msg: "actor " + message.aid + " found !", ID: ID});
      //TODO put ip, pid, port, ipc
      pubDiscovery.send(new Buffer(JSON.stringify({type: "result", from: ID, to: message.from, aid: message.aid})));
    }
  } else if (message.type === "result" && message.to === ID) {
    logger.makeLog("debug", "hub-9", {msg: "actor " + message.aid + " found on node " + message.from, ID: ID});
    //TODO create and save container and actor"s informations
    events.emit(message.aid + "!found");
  }
}

/**
 * Finds an actor
 * @param {string} aid
 * @param {function} callback
 */
function findActor(aid, callback) {
  logger.makeLog("debug", "hub-10", {msg: "searching actor " + aid + "...", ID: ID});
  //TODO handle bare/full aid (if bare : pick random bare-matching full)
  var actor = actors[aid];
  if (actor) {
    logger.makeLog("debug", "hub-11", {msg: "actor " + aid + " found !", ID: ID});
    process.nextTick(function () {
      callback(actor);
    }.bind(this));
  } else {
    logger.makeLog("debug", "hub-12", {msg: "actor " + aid + " not found, sending search request...", ID: ID});
    events.once(aid + "!found", callback);
    pubDiscovery.send(new Buffer(JSON.stringify({type: "search", from: ID, aid: aid})));
  }
}
