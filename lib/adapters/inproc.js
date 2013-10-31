/**
 * @module inproc adapter
 */

var h = require("../hubiquitus");
var timers = require("timers");
var logger = require("../logger");

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
  logger.makeLog("warn", "hub-100", "inproc onMessage should be overridden");
};
