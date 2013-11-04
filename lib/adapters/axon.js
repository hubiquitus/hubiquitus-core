/**
 * @module ZMQ
 */

var axon = require("axon");
var h = require("../hubiquitus");
var logger = require("../logger");
var actors = require("../actors");

/**
 * @enum {number}
 */
var replyFlag = {
  OK: 0,
  NOK: 1,
  CONTAINER_NOT_FOUND: 2,
  ACTOR_NOT_FOUND: 3
};

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
  socket.on("message", function (buffer, reply) {
    var message = JSON.parse(buffer);
    onRequest(message, reply);
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
  var buffer = new Buffer(JSON.stringify(message));
  var socket = findReqSocket(container);
  socket.on("drop", function () {
    var response = {flag: replyFlag.CONTAINER_NOT_FOUND};
    onReply(container, message, response, cb);
  });
  socket.send(buffer, function (buffer) {
    var response = JSON.parse(buffer);
    onReply(container, message, response, cb);
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
 * Handles incomming request
 * @param message {object} incomming message
 * @param reply {function}
 */
function onRequest(message, reply) {
  logger.makeLog("trace", "hub-110", "message received", {message: message});
  if (actors.exists(message.to, actors.scope.PROCESS)) {
    exports.onMessage(message, function (err, message) {
      var flag = err ? replyFlag.NOK : replyFlag.OK;
      var buffer = JSON.stringify({flag: flag, err: err, content: message});
      reply(buffer);
    });
  } else {
    logger.makeLog("trace", "hub-119", "actor " + message.to + " not found !");
    var buffer = JSON.stringify({flag: replyFlag.ACTOR_NOT_FOUND});
    reply(buffer);
  }
}

/**
 * Handles incomming reply
 * @param container {object} target container
 * @param message {object} message sent
 * @param response {object} response received
 * @param cb {function} message send callback
 */
function onReply(container, message, response, cb) {
  if (response.flag === replyFlag.CONTAINER_NOT_FOUND) {
    logger.makeLog("trace", "hub-118", "message droped; container " + container.id + " considered as dead");
    actors.removeByContainer(container.id);
    reqSocket[container.id].disconnect();
    delete reqSockets[container.id];
    cb(true);
  } else if (response.flag === replyFlag.ACTOR_NOT_FOUND) {
    logger.makeLog("trace", "hub-120", "actor " + message.to + " not found in node " + h.ID);
    actors.remove(message.to);
    cb(true);
  } else {
    cb(response.err, response.message);
  }
}

/**
 * Finds a socket to reach a container
 * @param container {object} target container
 * @returns {Socket} socket out
 */
function findReqSocket(container) {
  var socket;
  if (reqSockets[container.id]) {
    socket = reqSockets[container.id];
  } else {
    socket = axon.socket("req");
    socket.set("identity", "socket_out_" + container.id + "_" + h.ID);
    socket.set("hwm", 0);
    reqSockets[container.id] = socket;
    socket.connect(container.netInfo.ipc);
  }
  return socket;
}
