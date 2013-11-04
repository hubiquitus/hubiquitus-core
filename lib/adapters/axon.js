/**
 * @module ZMQ
 */

var axon = require("axon");
var h = require("../hubiquitus");
var logger = require("../logger");
var actors = require("../actors");

/**
 * @type {object}
 */
var reqSockets = {};

/**
 * Starts connection & binding
 */
exports.start = function (socket, addr, done) {
  //TODO handle already-in-use addr
  socket.bind(addr, function (err) {
    if (err) logger.makeLog("err", "hub-103", "failed to connect " + addr);
    done(err);
  });
  socket.on("message", internalOnMessage);
};

/**
 * Stops connection & binding
 */
exports.stop = function (socket) {
  socket.close();
};

/**
 * Sends a message
 * @param container {object} target container
 * @param message {object} message (hMessage)
 * @param cb {function} callback
 */
exports.send = function (container, message, cb) {
  var buffer = new Buffer(JSON.stringify(message));
  var socket = findSocketOut(container);
  socket.send(buffer, function (buffer) {
    var message = JSON.parse(buffer);
    cb(message);
  });
};

/**
 * Message handler has to be overridden (by the container)
 * @param message {object} message (hMessage)
 */
exports.onMessage = function (message) {
  logger.makeLog("warn", "hub-111", "axon onMessage should be overridden");
};

/**
 * Handle inconmming message
 * @param buffer {Buffer} incomming message
 * @param reply {function}
 */
function internalOnMessage(buffer, reply) {
  var message = JSON.parse(buffer);
  logger.makeLog("trace", "hub-110", "message received", {message: message});
  if (actors.exists(message.to, actors.scope.PROCESS)) {
    exports.onMessage(message, function (message) {
      reply(null, message);
    });
  } else {
    reply("actor " + message.to + " not found in node " + h.ID);
  }
}

/**
 * Finds a socket to reach a container
 * @param container {object} target container
 * @returns {Socket} socket out
 */
function findSocketOut(container) {
  var socket;
  if (reqSockets[container.id]) {
    socket = reqSockets[container.id];
  } else {
    socket = axon.socket("req");
    socket.set("identity", "socket_out_" + container.id + "_" + h.ID);
    reqSockets[container.id] = socket;
    socket.connect(container.netInfo.ipc);
  }
  return socket;
}
