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
socket.identity = "socket_ipc_" + h.ID;

/**
 * @type {string}
 */
exports.addr = "ipc:///tmp/" + utils.uuid();

/**
 * Starts ipc connection & binding
 */
exports.start = function (done) {
  utils.zmq.start(socket, exports.addr, function (err) {
    if (!err) logger.makeLog("trace", "hub-104", "ipc adapter started !");
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
 * Sends an ipc message
 * @param container {object} target container
 * @param message {object} message (hMessage)
 * @param cb {function} callback
 */
exports.send = function (container, message, cb) {
  utils.zmq.send(container, message, cb);
  logger.makeLog("trace", "hub-108", "message " + message.id + " sent ipc");
};

/**
 * Ipc message handler has to be overridden (by the container)
 * @param message {object} message (hMessage)
 */
exports.onMessage = function (message) {
  logger.makeLog("warn", "hub-101", "ipc onMessage should be overridden");
};
