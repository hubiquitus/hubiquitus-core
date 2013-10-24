/**
 * @module hubiquitus
 * Actors container
 */

var _ = require("lodash");
var zmq = require('zmq');
var EventEmitter = require("events").EventEmitter;

var ip = require("./utils/ip");
var uuid = require('./utils/uuid');
var logger = require("./logger");

/**
 * @type {string}
 */
const ID = uuid();

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

var adapters = {
  inproc: require("./adapters/inproc")
};

var actors = {};
exports.ip = ip.resolve();

/**
 * Process a message
 * @param message {object} message (hMessage)
 */
var onMessage = function (message) {
  logger.makeLog("trace", "hub-3", {msg: "message received", message: message});
  actors[message.actor].onMessage(message);
};
adapters.inproc.onMessage = onMessage;

/**
 * Sends a message
 * @param sender {string} sender id (aid)
 * @param receiver {string} receiver id (aid)
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
 * @param id {string} actor id (aid)
 * @param onMessage {function} actor handler
 * @returns module reference
 */
exports.addActor = function (id, onMessage) {
  logger.makeLog("trace", "hub-1", {msg: "actor added", actor: id});
  var actor = {id: id};
  actor.onMessage = onMessage.bind(actor);
  actor.send = function (to, message, cb) {
    exports.send(id, to, message, cb);
  };
  actors[actor.id] = actor;
  return module.exports;
};

/**
 * Starts containers discovery
 * @param {string} addr
 */
function startDiscovery(addr) {
    pubDiscovery.bind(addr, function (err) {
        if (err) logger.error(ID, err);
    });
    subDiscovery.connect(addr, function (err) {
        if (err) logger.error(ID, err);
    });
    subDiscovery.subscribe("").on("message", onDiscoveryMessage);
}

/**
 * @param {Buffer} buffer
 */
function onDiscoveryMessage(buffer) {
    if (!buffer || !buffer.length) return;

    var message = JSON.parse(buffer.toString());
    if (message.type === 'search' && message.from !== ID) {
        logger.debug(ID, "Search request for actor " + message.aid + " received");
        var actor = _.find(actors, function (actor) {
            return actor.aid === message.aid;
        });
        if (actor) {
            logger.debug(ID, "Actor " + message.aid + " found !");
            //TODO put ip, pid, port, ipc
            pubDiscovery.send(new Buffer(JSON.stringify({'type': 'result', 'from': ID, to: message.from, 'aid': message.aid})));
        }
    } else if (message.type === 'result' && message.to === ID) {
        logger.debug(ID, "Actor " + message.aid + " found on node " + message.from);
        //TODO create and save container and actor's informations
        events.emit(message.aid + '!found');
    }
}

/**
 * @param {string} aid
 * @param {function} callback
 */
function findActor(aid, callback) {
    logger.debug(ID, "Searching actor " + aid + "...");
    var actor = _.find(actors, function (actor) {
        return actor.aid === aid;
    });
    if (actor) {
        logger.debug(ID, "Actor " + aid + " found !");
        process.nextTick(function () {
            callback(actor);
        }.bind(this));
    } else {
        logger.debug(ID, "Actor " + aid + " not found, sending search request...");
        events.once(aid + '!found', callback);
        pubDiscovery.send(new Buffer(JSON.stringify({'type': 'search', 'from': ID, 'aid': aid})));
    }
}