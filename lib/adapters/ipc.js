/**
 * @module ipc adapter
 */

var h = require("../hubiquitus");
var zmq = require("zmq");
var Buffer = require("buffer");
var logger = require("../logger");
var ack = require("./utils/ack");
var protocol = require("./utils/protocol");
var actors = require("../actors");
var utils = {
  uuid: require("../utils/uuid")
};

/**
 * @type {Socket}
 */
var socketIn = zmq.socket("router");
socketIn.identity = "socket_ipc_" + h.ID;

/**
 * @type {object}
 */
var socketsOut = {};

/**
 * @type {string}
 */
exports.addr = "ipc:///tmp/" + utils.uuid();

/**
 * Starts ipc connection & binding
 */
exports.start = function (done) {
  //TODO handle already-in-use addr
  socketIn.bind(exports.addr, function (err) {
    if (err) {
      logger.makeLog("err", "hub-103", {msg: "failed to connect " + exports.addr, err: err});
    } else {
      logger.makeLog("trace", "hub-104", {msg: "ipc adapter started", ID: h.ID});
    }
    done();
  });
  socketIn.on("message", function (envelope, buffer) {
    onZmqMessage(socketIn, envelope, buffer);
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
 * @param container {object} target container
 * @param message {object} message (hMessage)
 * @param cb {function} callback
 */
exports.send = function (container, message, cb) {
  var ackId = ack.generate(message.to, container.id, cb);
  var buffer = protocol.buildZmqMessage(ack.flag.ACK_NEEDED, ackId, message);
  var socket = findSocketOut(container);
  socket.send(buffer);
  logger.makeLog("trace", "hub-108", {msg: "message sent ipc", msgid: message.id, ID: h.ID});
};

/**
 * Ipc message handler has to be overridden (by the container)
 * @param message {object} message (hMessage)
 */
exports.onMessage = function (message) {
  logger.makeLog("warn", "hub-101", "ipc onMessage should be overridden");
};

/**
 * Handle inconmming message
 * @param envelope {Buffer} zmq envelope
 * @param buffer {Buffer} incomming message
 * @param socket {Socket}
 */
function onZmqMessage(socket, envelope, buffer) {
  var zmqMessage = protocol.parseZmqMessage(buffer);
  var ackFlag = zmqMessage.ackFlag;
  var ackId = zmqMessage.ackId;
  var message = zmqMessage.message;
  logger.makeLog("trace", "hub-110", {msg: "message ipc received", ackFlag: ackFlag, message: message, ID: h.ID});
  if (ackFlag === ack.flag.ACK_NEEDED) {
    if (actors.exists(message.to, actors.scope.PROCESS)) {
      socket.send([envelope, protocol.buildZmqMessage(ack.flag.ACTOR_ACK, ackId)]);
      exports.onMessage(message, function (message) {
        socket.send([envelope, protocol.buildZmqMessage(ack.flag.NO_ACK, 0, message)]);
      });
    } else {
      socket.send([envelope, protocol.buildZmqMessage(ack.flag.CONTAINER_ACK, ackId)]);
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
      onZmqMessage(socket, null, buffer);
    });
  }
  return socket;
}
