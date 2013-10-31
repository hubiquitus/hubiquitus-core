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
  logger.makeLog("trace", "hub-105", "tcp adapter started !");
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
  logger.makeLog("trace", "hub-109", "message " + message.id + " sent tcp");
};

/**
 * TCP message handler has to be overridden (by the container)
 * @param message {object} message (hMessage)
 */
exports.onMessage = function (message) {
  logger.makeLog("warn", "hub-106", "tcp onMessage should be overridden");
};
