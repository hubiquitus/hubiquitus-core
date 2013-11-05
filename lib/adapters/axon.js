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
  socket.format("json");
  socket.bind(addr, function (err) {
    if (err) logger.makeLog("err", "hub-103", "failed to connect " + addr);
    done(err);
  });
  socket.on("message", onRequest);
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
 * @param adapterType {enum} adapter type
 * @param cb {function} callback
 */
exports.send = function (container, message, adapterType, cb) {
  findReqSocket(container, adapterType, function (socket) {
    socket.once("drop", function () {
      var response = {flag: replyFlag.CONTAINER_NOT_FOUND};
      onReply(container, message, response, cb);
    });
    socket.send(message, function (response) {
      onReply(container, message, response, cb);
    });
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
      reply({flag: flag, err: err, content: message});
    });
  } else {
    logger.makeLog("trace", "hub-119", "actor " + message.to + " not found !");
    reply({flag: replyFlag.ACTOR_NOT_FOUND});
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
    reqSockets[container.id].close();
    delete reqSockets[container.id];
    cb && cb(true);
  } else if (response.flag === replyFlag.ACTOR_NOT_FOUND) {
    logger.makeLog("trace", "hub-120", "actor " + message.to + " not found in node " + h.ID);
    actors.remove(message.to);
    cb && cb(true);
  } else {
    cb && cb(response.err, response.message);
  }
}

/**
 * Finds a socket to reach a container
 * @param container {object} target container
 * @param adapterType {enum} adapter type
 * @param {function} cb
 */
function findReqSocket(container, adapterType, cb) {
  var socket;
  if (reqSockets[container.id]) {
    socket = reqSockets[container.id];
    cb && cb(socket);
  } else {
    socket = axon.socket("req");
    socket.set("identity", "socket_out_" + container.id + "_" + h.ID);
    socket.set("hwm", 0);
    socket.format("json");
    reqSockets[container.id] = socket;
    socket.connect(container.netInfo[adapterType], function () {
      cb && cb(socket);
    });
  }
}
