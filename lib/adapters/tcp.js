/**
 * @module ipc adapter
 */

var h = require("../hubiquitus");
var logger = require("../logger");

/**
 * @type {string}
 */
var addr = exports.addr = "";

/**
 * Starts ipc connection & binding
 */
exports.start = function (done) {
  logger.makeLog("trace", "hub-105", {msg: "tcp adapter started", ID: h.ID});
  done();
};

/**
 * Stops ipc connection & binding
 */
exports.stop = function () {};

/**
 * Sends an tcp message
 * @param container {object} target container
 * @param message {object} message (hMessage)
 * @param cb {function} callback
 */
exports.send = function (container, message, cb) {
};

/**
 * TCP message handler has to be overridden (by the container)
 * @param message {object} message (hMessage)
 */
exports.onMessage = function (message) {
  logger.makeLog("warn", "hub-106", "tco onMessage should be overridden");
};
