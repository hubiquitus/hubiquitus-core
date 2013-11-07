/**
 * @module inproc adapter
 */

var timers = require("timers");
var logger = require("../logger");
var EventEmitter = require("events").EventEmitter;

/**
 * @type {EventEmitter}
 */
const events = exports.events = new EventEmitter();

/**
 * Sends an inproc message
 * @param message {object} message (hMessage)
 */
exports.send = function (message) {
  timers.setImmediate(function () {
    logger.makeLog("trace", "hub-107", "message " + message.id + " sent inproc");
    exports.onMessage(message, function (response) {
      events.emit("response", response);
    });
  });
};

/**
 * Inproc message handler has to be overridden (by the container)
 * @param message {object} message (hMessage)
 * @param cb {function} callback
 */
exports.onMessage = function (message, cb) {
  events.emit("message", message, cb);
};
