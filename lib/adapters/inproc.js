/**
 * @module inproc adapter
 */

var timers = require("timers");
var logger = require("../logger");

/**
 * Sends an inproc message
 * @param message {object} message (hMessage)
 */
exports.send = function (message) {
  timers.setImmediate(function () {
    exports.onMessage(message);
  });
};

/**
 * Inproc message handler has to be overridden (by the container)
 * @param message {object} message (hMessage)
 */
exports.onMessage = function (message) {
  logger.makeLog("warn", "hub-100", "inproc onMessage should be overridden");
};
