/**
 * @module inproc adapter
 */

var timers = require("timers");
var EventEmitter = require("events").EventEmitter;
var logger = require("../logger");
var filter = require("../filter");

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
    filter(message, "request", function (err) {
      if (err) return logger.makeLog("trace", "hub-126", "request " + message.id + " filtered", err);
      exports.onMessage(message, function (response) {
        filter(response.message, "response", function (err) {
          if (err) return logger.makeLog("trace", "hub-127", "response " + message.id + " filtered", err);
          events.emit("response", response);
        });
      });
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
