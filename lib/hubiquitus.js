/**
 * @module hubiquitus
 * Actors container
 */

var ip = require("./utils/ip");
var _ = require("lodash");
var logger = require("./logger");
var adapters = {
  inproc: require("./adapters/inproc")
};

var actors = {};
exports.actors = [];
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
  registerActor(actor);
  return module.exports;
};

/**
 * Registers an actor
 * @param actor {object} actor
 */
function registerActor(actor) {
  actors[actor.id] = actor;
  if (!_.contains(exports.actors, actor.id)) {
    exports.actors.push(actor.id);
  }
}
