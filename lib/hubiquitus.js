/**
 * @module hubiquitus
 * Actors container
 */

var ip = require("./utils/ip");
var _ = require("lodash");

var actors = {};
exports.ip = ip.resolve();

exports.send = function (sender, receiver, message, cb) {
  message.publisher = sender;
  message.actor = receiver;
  actors[receiver].onMessage(message);
  if (_.isFunction(cb)) cb();
  return module.exports;
};

exports.addActor = function (id, handler) {
  var actor = {id: id, onMessage: handler};
  actor.send = function (to, message, cb) {
    exports.send(id, to, message, cb);
  };
  handler.bind(actor);
  actors[id] = actor;
  return module.exports;
};
