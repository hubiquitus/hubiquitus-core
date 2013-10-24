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
 * @type {object}
 */
var containers = {};

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
 * @returns {object} module reference
 */
exports.send = function (sender, receiver, message, cb) {
  message.publisher = sender;
  findActor(receiver, function (aid) {
    message.actor = aid;
    if (actors[aid].container === ID) {
      adapters.inproc.send(message);
      logger.makeLog("trace", "hub-2", {msg: "message sent inproc", message: message});
      if (_.isFunction(cb)) cb();
    }
  });
  return this;
};

/**
 * Adds an actor to the container
 * @param aid {string} actor id
 * @param onMessage {function} actor handler
 * @returns {object} module reference
 */
exports.addActor = function (aid, onMessage) {
  if (utils.aid.isBare(aid)) aid += "/" + utils.uuid();
  logger.makeLog("trace", "hub-1", {msg: "actor added", actor: aid});
  var actor = {aid: aid, container: ID};
  actor.onMessage = onMessage.bind(actor);
  actor.send = function (to, message, cb) {
    exports.send(aid, to, message, cb);
  };
  actors[actor.aid] = actor;
  return this;
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
    logger.makeLog("trace", "hub-7", {msg: "search request for actor " + message.aid + " received", ID: ID});
    var actor = pickActorInCache(message.aid);
    if (actor) {
      logger.makeLog("trace", "hub-8", {msg: "actor " + message.aid + " found !", ID: ID});
      //TODO put ip, pid, port, ipc
      pubDiscovery.send(new Buffer(JSON.stringify({type: "result", from: ID, to: message.from, aid: message.aid})));
    }
  } else if (message.type === "result" && message.to === ID) {
    logger.makeLog("trace", "hub-9", {msg: "actor " + message.aid + " found on node " + message.from, ID: ID});
    //TODO create and save container and actor"s informations
    events.emit(message.aid + "!found");
  }
}

/**
 * Finds an actor
 * @param aid {string} requested actor id
 * @param {function} callback
 */
function findActor(aid, callback) {
  logger.makeLog("trace", "hub-10", {msg: "searching actor " + aid + "...", ID: ID});
  var actor = pickActorInCache(aid);
  if (actor) {
    logger.makeLog("trace", "hub-11", {msg: "actor " + aid + " found in cache !", ID: ID});
    process.nextTick(function () {
      callback(actor);
    }.bind(this));
  } else {
    logger.makeLog("trace", "hub-12", {msg: "actor " + aid + " not found, sending search request...", ID: ID});
    events.once(aid + "!found", callback);
    pubDiscovery.send(new Buffer(JSON.stringify({type: "search", from: ID, aid: aid})));
  }
}

/**
 * Searches an actor into the cache
 * @param aid {string} requested actor id
 * @returns {object} actor id if requested actor id exists in cache, undefined else
 */
function pickActorInCache(aid) {
  var actor;
  if (utils.aid.isFull(aid) && actors[aid]) {
    actor = aid;
  } else {
    var matchingActors = [];
    _.forEach(_.keys(actors), function (item) {
      if (utils.aid.bare(item) === aid) {
        matchingActors.push(item);
      }
    });
    if (matchingActors.length !== 0) {
      actor = matchingActors[_.random(matchingActors.length - 1)];
    }
  }
  return actor;
}
