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
exports.ackFlag = {
  ACK_NEEDED: 0,       // Protocol need an ack within ack timeout
  ACK_NOT_NEEDED: 1,   // Protocol doesn't need an ack. Used for reply in a request/reply
  ACK_TIMEOUT: 2,      // Ack wasn't received within the timeout
  CONTAINER_ACK: 3,    // Container is still alive but actor wasn't found
  ACTOR_ACK: 4         // Container and actor found
};

/**
 * Generate an ack id and setup its timeout
 * @param aid {string} target actor id
 * @param cid {string} target container id
 * @param cb {function} callback invoked at ack reponse/timeout
 * @returns {number} ack id
 */
exports.generate = function (aid, cid, cb) {
  var ackId = _.random(4000000000);

  events.once("ack|" + ackId, function (status) {
    onStatus(status, aid, cid, cb);
  });

  // at ack timeout, if no ack response was received, we consider the container to be dead
  setTimeout(function () {
    exports.emitStatus(ackId, exports.ackFlag.ACK_TIMEOUT);
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
 * @param aid {string} target actor id
 * @param cid {string} target container id
 * @param cb {function} callback to invoke at ack response/timeout
 */
var onStatus = function (status, aid, cid, cb) {
  var err = null;
  if (status === exports.ackStatus.ACK_TIMEOUT) {
    err = logger.makeLog("trace", "hub-201", {msg: "ack timeout: container " + cid + " dead", ID: h.ID});
    actors.removeAllByContainer(cid);
  } else if (status === exports.ackStatus.CONTAINER_ACK) {
    err = logger.makeLog("trace", "hub-202", {msg: "ack response: actor " + aid + " dead", ID: h.ID});
    actors.remove(aid);
  }
  if (_.isFunction(cb)) cb(err);
};
