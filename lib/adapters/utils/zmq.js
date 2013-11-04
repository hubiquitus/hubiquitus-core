/**
 * @module ZMQ
 */

var zmq = require("zmq");
var h = require("../../hubiquitus");
var logger = require("../../logger");
var actors = require("../../actors");
var ack = require("./ack");

/**
 * @type {object}
 */
var socketsOut = {};

/**
 * Starts connection & binding
 */
exports.start = function (socket, addr, done) {
  //TODO handle already-in-use addr
  socket.bind(addr, function (err) {
    if (err) logger.makeLog("err", "hub-103", "failed to connect " + addr);
    done(err);
  });
  socket.on("message", function (envelope, buffer) {
    internalOnMessage(socket, envelope, buffer);
  });
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
  var ackId = ack.generate(message.to, container.id, cb);
  var buffer = buildMessage(ack.flag.ACK_NEEDED, ackId, message);
  var socket = findSocketOut(container);
  socket.send(buffer);
};

/**
 * Message handler has to be overridden (by the container)
 * @param message {object} message (hMessage)
 */
exports.onMessage = function (message) {
  logger.makeLog("warn", "hub-111", "zmq onMessage should be overridden");
};

/**
 * Handle inconmming message
 * @param envelope {Buffer} zmq envelope
 * @param buffer {Buffer} incomming message
 * @param socket {Socket}
 */
function internalOnMessage(socket, envelope, buffer) {
  var zmqMessage = parseMessage(buffer);
  var ackFlag = zmqMessage.ackFlag;
  var ackId = zmqMessage.ackId;
  var message = zmqMessage.message;
  logger.makeLog("trace", "hub-110", "message received", {zmqMessage: zmqMessage});
  if (ackFlag === ack.flag.ACK_NEEDED) {
    if (actors.exists(message.to, actors.scope.PROCESS)) {
      socket.send([envelope, buildMessage(ack.flag.ACTOR_ACK, ackId)]);
      exports.onMessage(message, function (message) {
        socket.send([envelope, buildMessage(ack.flag.NO_ACK, 0, message)]);
      });
    } else {
      socket.send([envelope, buildMessage(ack.flag.CONTAINER_ACK, ackId)]);
    }
  } else {
    ack.emitStatus(ackId, ackFlag);
  }
}

/**
 * Finds a socket to reach a container
 * @param container {object} target container
 * @returns {Socket} socket out
 */
function findSocketOut(container) {
  var socket;
  if (socketsOut[container.id]) {
    socket = socketsOut[container.id];
  } else {
    socket = zmq.socket("dealer");
    socket.identity = "socket_out_" + container.id + "_" + h.ID;
    socketsOut[container.id] = socket;
    socket.connect(container.netInfo.ipc);
    socket.on("message", function (buffer) {
      internalOnMessage(socket, null, buffer);
    });
  }
  return socket;
}

/**
 * Builds a ZMQ message [ACK_FLAG(1 byte)|ACK_ID(4 bytes)|JSON_MESSAGE]
 * @param ackFlag {number} ack flag
 * @param ackId {number} ack id
 * @param message {object} message
 * @returns {Buffer}
 */
function buildMessage(ackFlag, ackId, message) {
  var jsonMessage = message ? JSON.stringify(message) : "";
  var buffer = new Buffer(Buffer.byteLength(jsonMessage, "utf8") + 5);
  buffer.writeUInt8(ackFlag, 0);
  buffer.writeUInt32BE(ackId, 1);
  buffer.write(jsonMessage, 5, "utf8");
  return buffer;
}

/**
 * Parses a ZMQ message
 * @param buffer {Buffer} buffer to parse
 */
function parseMessage(buffer) {
  var ackFlag = buffer.readUInt8(0);
  var ackId = buffer.readUInt32BE(1);
  var message = (buffer.length > 5) ? JSON.parse(buffer.toString("utf8", 5)) : "";
  return {ackFlag: ackFlag, ackId: ackId, message: message};
}
