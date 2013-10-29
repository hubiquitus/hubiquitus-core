/**
 * @module acknowledgment management
 */

var h = require("../../hubiquitus");
var EventEmitter = require("events").EventEmitter;
var _ = require("lodash");

/**
 * @type {EventEmitter}
 */
var events = new EventEmitter();

/**
 * @type {number}
 */
var ackTimeout = 1000;

/**
 * @type {enum}
 */
exports.ackStatus = {
  CONTAINER_NOT_FOUND: 0,
  ACTOR_NOT_FOUND: 1,
  ACTOR_FOUND: 2
};

/**
 * Generate an ack id and setup its timeout
 * @param actor {object} target actor
 * @param cb {function} callback invoked at ack reponse/timeout
 * @returns {number} ack id
 */
exports.generate = function (actor, cb) {
  var ackId = _.random(4000000000);

  events.once("ack|" + ackId, function (status) {
    onStatus(status, actor, cb);
  });

  // at ack timeout, if no ack response was received, we consider the container to be dead
  setTimeout(function () {
    exports.emitStatus(ackId, exports.ackStatus.CONTAINER_NOT_FOUND);
  }, ackTimeout);

  return ack;
};

/**
 * Notify an ack status
 * @param ackId {number} ack id
 * @param status {number} ack status
 */
exports.emitStatus = function (ackId, status) {
  events.emit("ack|" + ackId, status);
};

/**
 * Handle an ack status
 * @param status {number} ack status
 * @param actor {object} target actor
 * @param cb {function} callback to invoke at ack response/timeout
 */
var onStatus = function (status, actor, cb) {
  var err = null;
  if (status === exports.ackStatus.CONTAINER_NOT_FOUND) {
    err = logger.makeLog("trace", "hub-201", {msg: "ack timeout: container " + actor.container.id + " dead", ID: h.ID});
    actors.removeAllByContainer(actor.container.id);
  } else if (status === exports.ackStatus.ACTOR_NOT_FOUND) {
    err = logger.makeLog("trace", "hub-202", {msg: "ack response: actor " + actor.aid + " dead", ID: h.ID});
    actors.remove(actor.aid);
  }
  if (_.isFunction(cb)) cb(err);
};
