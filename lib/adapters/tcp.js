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
