/**
 * @module ipc adapter
 */

var h = require("../hubiquitus");
var zmq = require("zmq");
var logger = require("../logger");
var utils = {
  uuid: require("../utils/uuid"),
  zmq: require("./utils/zmq")
};

/**
 * @type {Socket}
 */
var socket = zmq.socket("router");
socket.identity = "socket_tcp_" + h.ID;

/**
 * @type {string}
 */
exports.addr = "";

/**
 * Starts ipc connection & binding
 */
exports.start = function (done) {
  utils.zmq.start(socket, exports.addr, function (err) {
    if (!err) logger.makeLog("trace", "hub-105", "tcp adapter started !");
    done();
  });
};

/**
 * Stops ipc connection & binding
 */
exports.stop = function () {
  utils.zmq.stop(socket);
};

/**
 * Sends an tcp message
 * @param container {object} target container
 * @param message {object} message (hMessage)
 * @param cb {function} callback
 */
exports.send = function (container, message, cb) {
  utils.zmq.send(container, message, cb);
  logger.makeLog("trace", "hub-109", "message " + message.id + " sent tcp");
};

/**
 * TCP message handler has to be overridden (by the container)
 * @param message {object} message (hMessage)
 */
exports.onMessage = function (message) {
  logger.makeLog("warn", "hub-106", "tcp onMessage should be overridden");
};
