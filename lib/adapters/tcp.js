/**
 * @module ipc adapter
 */

var h = require("../hubiquitus");
var _ = require("lodash");
var zmq = require("zmq");
var logger = require("../logger");
var utils = {
  uuid: require("../utils/uuid"),
  ip: require("../utils/ip"),
  zmq: require("./utils/zmq")
};

/**
 * @type {boolean}
 */
var started = false;

/**
 * @type {Socket}
 */
var socket = zmq.socket("router");
socket.identity = "socket_tcp_" + h.ID;

/**
 * @type {string}
 */
exports.addr = "tcp://" + utils.ip.resolve();

/**
 * Starts tcp connection & binding
 */
exports.start = function (done) {
  exports.addr += ":" + _.random(3000, 30000);
  utils.zmq.start(socket, exports.addr, function (err) {
    if (!err) {
      logger.makeLog("trace", "hub-105", "tcp adapter started !");
      started = true;
    }
    done();
  });
};

/**
 * Stops tcp connection & binding
 */
exports.stop = function () {
  utils.zmq.stop(socket);
  started = false;
};

/**
 * Sends an tcp message
 * @param container {object} target container
 * @param message {object} message (hMessage)
 * @param cb {function} callback
 */
exports.send = function (container, message, cb) {
  if (started) {
    utils.zmq.send(container, message, cb);
    logger.makeLog("trace", "hub-109", "message " + message.id + " sent tcp");
  } else {
    logger.makeLog("warn", "hub-117", "tcp adapter not started; cannot send message " + message.id);
  }
};

/**
 * TCP message handler has to be overridden (by the container)
 * @param message {object} message (hMessage)
 */
exports.onMessage = function (message) {
  logger.makeLog("warn", "hub-106", "tcp onMessage should be overridden");
};
