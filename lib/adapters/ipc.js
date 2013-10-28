/**
 * @module ipc adapter
 */

var hubiquitus = require("../hubiquitus");
var zmq = require("zmq");
var logger = require("../logger");
var utils = {
  uuid: require("../utils/uuid")
};

/**
 * @type {Socket}
 */
var socketIn = zmq.socket("router");
socketIn.identity = "socket_ipc_" + hubiquitus.ID;

/**
 * @type {object}
 */
var socketsOut = {};

/**
 * @type {string}
 */
var addr = exports.addr = "ipc:///tmp/" + utils.uuid();

/**
 * Starts ipc connection & binding
 */
exports.start = function (done) {
  socketIn.bind(addr, function (err) {
    if (err) logger.makeLog("err", "hub-103", {msg: "failed to connect " + addr, err: err});
    done();
  });
  socketIn.on("message", function (buffer) {
    var message = JSON.parse(buffer.toString());
    exports.onMessage(message);
  });
};

/**
 * Stops ipc connection & binding
 */
exports.stop = function () {
  socketIn.close();
};

/**
 * Sends an ipc message
 * @param container {object} target container info
 * @param message {object} message (hMessage)
 * @param cb {function} callback
 */
exports.send = function (container, message, cb) {
};

/**
 * Ipc message handler has to be overridden (by the container)
 * @param message {object} message (hMessage)
 */
exports.onMessage = function (message) {
  logger.makeLog("warn", "hub-101", "ipc onMessage should be overridden");
};
