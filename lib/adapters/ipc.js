/**
 * @module ipc adapter
 */

var h = require("../hubiquitus");
var _ = require("lodash");
var axon = require("axon");
var logger = require("../logger");
var utils = {
  uuid: require("../utils/uuid")
};

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
socket.set("identity", "socket_ipc_" + h.ID);

/**
 * @type {string}
 */
exports.addr = "unix://" + utils.uuid();

/**
 * Starts ipc connection & binding
 */
exports.start = function (done) {
  adapters.axon.start(socket, exports.addr, function (err) {
    if (!err) {
      logger.makeLog("trace", "hub-104", "ipc adapter started !");
      started = true;
    }
    done();
  });
};

/**
 * Stops ipc connection & binding
 */
exports.stop = function () {
  adapters.axon.stop(socket);
  started = false;
};

/**
 * Sends an ipc message
 * @param container {object} target container
 * @param message {object} message (hMessage)
 * @param cb {function} callback
 */
exports.send = function (container, message, cb) {
  if (started) {
    adapters.axon.send(container, message, cb);
    logger.makeLog("trace", "hub-108", "message " + message.id + " sent ipc");
  } else {
    logger.makeLog("warn", "hub-116", "ipc adapter not started; cannot send message " + message.id);
  }
};

/**
 * Ipc message handler has to be overridden (by the container)
 * @param message {object} message (hMessage)
 */
exports.onMessage = function (message) {
  logger.makeLog("warn", "hub-101", "ipc onMessage should be overridden");
};
