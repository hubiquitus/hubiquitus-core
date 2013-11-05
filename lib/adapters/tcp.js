/**
 * @module tcp adapter
 */

var h = require("../hubiquitus");
var _ = require("lodash");
var axon = require("axon");
var logger = require("../logger");

/**
 * @type {object}
 */
var adapters = {
  axon: require("./axon")
};

/**
 * @type {boolean}
 */
var started = false;

/**
 * @type {Socket}
 */
var socket = axon.socket("rep");
socket.set("identity", "socket_tcp_" + h.ID);

/**
 * @type {string}
 */
exports.addr = "tcp://";

/**
 * @type {number}
 */
exports.port = _.random(3000, 30000);

/**
 * Starts tcp connection & binding
 */
exports.start = function (done) {
  exports.port = _.random(3000, 30000);
  exports.addr += h.netInfo.ip + ":" + exports.port;
  adapters.axon.start(socket, exports.addr, function (err) {
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
  adapters.axon.stop(socket);
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
    adapters.axon.send(container, message, cb);
    logger.makeLog("trace", "hub-109", "message " + message.id + " sent tcp");
  } else {
    logger.makeLog("warn", "hub-117", "tcp adapter not started; cannot send message " + message.id);
  }
};

/**
 * Tcp message handler has to be overridden (by the container)
 * @param message {object} message (hMessage)
 */
exports.onMessage = function (message) {
  logger.makeLog("warn", "hub-106", "tcp onMessage should be overridden");
};
