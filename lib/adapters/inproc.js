/**
 * @module inproc adapter
 */

var timers = require("timers");
var logger = require("../logger");
var EventEmitter = require("events").EventEmitter;

/**
 * @type {EventEmitter}
 */
var events = new EventEmitter();
exports.on = events.on.bind(events);
exports.emit = events.emit.bind(events);

/**
 * Sends an inproc message
 * @param message {object} message (hMessage)
 * @param cb {function} callback
 */
exports.send = function (message, cb) {
  timers.setImmediate(function () {
    logger.makeLog("trace", "hub-107", "message " + message.id + " sent inproc");
    exports.onMessage(message, function () {
      timers.setImmediate(cb);
    });
  });
};

/**
 * Inproc message handler has to be overridden (by the container)
 * @param message {object} message (hMessage)
 */
exports.onMessage = function (message) {
  events.emit("message", message);
};
