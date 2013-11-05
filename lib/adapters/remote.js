/**
 * @module ZMQ
 */

var axon = require("axon");
var _ = require("lodash");
var EventEmitter = require("events").EventEmitter;
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
 * @type {string}
 */
var addr = "tcp://";

/**
 * @type {boolean}
 */
var started = false;

/**
 * @type {number}
 */
exports.port = _.random(3000, 30000);

/**
 * @type {Socket}
 */
var repSocket = axon.socket("rep");
repSocket.set("identity", "socket_tcp_" + h.ID);

/**
 * @type {object}
 */
var reqSockets = {};

/**
 * @type {EventEmitter}
 */
var events = new EventEmitter();
exports.on = events.on.bind(events);
exports.emit = events.emit.bind(events);

/**
 * Starts connection & binding
 */
exports.start = function (done) {
  //TODO handle already-in-use addr
  addr += h.netInfo.ip + ":" + exports.port;
  repSocket.format("json");
  repSocket.bind(addr, function (err) {
    if (err) {
      logger.makeLog("err", "hub-103", "tcp adapter failed to connect " + addr);
    } else {
      logger.makeLog("trace", "hub-105", "tcp adapter started !");
      started = true;
    }
    done();
  });
  repSocket.on("message", onRequest);
};

/**
 * Stops connection & binding
 */
exports.stop = function (socket) {
  started = false;
  repSocket && repSocket.close();
};

/**
 * Sends a message
 * @param container {object} target container
 * @param message {object} message (hMessage)
 * @param cb {function} callback
 */
exports.send = function (container, message, cb) {
  logger.makeLog("trace", "hub-109", "sending message " + message.id + " tcp...");
  findReqSocket(container, function (socket) {
    logger.makeLog("trace", "hub-110", "socket found ! " + message.id + " sent tcp !");
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
  events.emit("message", message);
};

/**
 * Handles incomming request
 * @param message {object} incomming message
 * @param reply {function}
 */
function onRequest(message, reply) {
  logger.makeLog("trace", "hub-110", "message received remotly", {message: message});
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
    if (reqSockets[container.id]) {
      reqSockets[container.id].close();
      delete reqSockets[container.id];
    }
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
 * @param {function} cb
 */
function findReqSocket(container, cb) {
  var socket;
  if (reqSockets[container.id]) {
    socket = reqSockets[container.id];
    if (socket.connected) {
      cb && cb(socket);
    } else {
      // socket exists but still tries to connect...
      socket.on("connect", function () {
        cb && cb(socket);
      });
    }
  } else {
    socket = axon.socket("req");
    socket.set("identity", "socket_out_" + container.id + "_" + h.ID);
    socket.set("hwm", 0);
    socket.format("json");
    reqSockets[container.id] = socket;

    // if message is droped, we consider that the target container is dead
    socket.on("drop", function (message) {
      var response = {flag: replyFlag.CONTAINER_NOT_FOUND};
      onReply(container, message, response, cb);
    });

    socket.connect("tcp://" + container.netInfo.ip + ":" + container.netInfo.port, function () {
      cb && cb(socket);
    });
  }
}
