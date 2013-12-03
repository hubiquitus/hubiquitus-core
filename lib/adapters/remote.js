/**
 * @module remote adapter
 */

var net = require('net');
var Socket = net.Socket;
var _ = require('lodash');
var tv4 = require('tv4');
var EventEmitter = require('events').EventEmitter;
var h = require('../hubiquitus');
var logger = require('../logger')('hubiquitus:core:adapter:remote');
var actors = require('../actors');
var schemas = require('../schemas');

/**
 * @type {boolean}
 */
var locked = false;

/**
 * @type {number}
 */
exports.port = null;

/**
 * @type {Socket}
 */
var server = null;

/**
 * @type {object}
 */
var sockets = {};

/**
 * @type {number}
 */
var socketSearchTimeout = 1000;

/**
 * @type {EventEmitter}
 */
const events = exports.events = new EventEmitter();
events.setMaxListeners(0);

/**
 * Starts connection & binding
 * @param {function} done
 */
exports.start = function (done) {
  if (locked) {
    return logger.makeLog('warn', 'hub-111', 'try to start tcp adapter while already started/starting !');
  }

  locked = true;
  events.once('server listenning', function () {
    logger.makeLog('trace', 'hub-106', 'tcp adapter started !');
    done();
  });
  listen();
};

/**
 * Stops connection & binding
 * @param {function} done
 */
exports.stop = function (done) {
  if (!locked) {
    return logger.makeLog('warn', 'hub-114', 'try to stop tcp adapter while already stopped/stopping !');
  }

  events.once('server closed', function () {
    logger.makeLog('trace', 'hub-108', 'tcp adapter stopped !');
    done();
  });
  server.close();
  locked = false;
};

/**
 * Starts server socket
 */
function listen() {
  server = net.createServer();

  server.on('error', function (err) {
    logger.makeLog('trace', 'hub-103', 'tcp server socket failed to listen on port ' + exports.port, err);
    listen();
  });

  server.on('listening', function () {
    logger.makeLog('trace', 'hub-105', 'tcp server socket listenning on port ' + exports.port + ' !');
    h.netInfo.port = exports.port;
    events.emit('server listenning');
  });

  server.on('close', function () {
    logger.makeLog('trace', 'hub-104', 'tcp server socket closed !');
    events.emit('server closed');
  });

  server.on('connection', function (socket) {
    socket.infos = {onMessage: onRequest};
    socket.on('data', function (buffer) {
      read(socket, buffer);
    });
  });

  exports.port = _.random(3000, 30000);
  logger.makeLog('trace', 'hub-101', 'tcp server socket tries to listen on port ' + exports.port + '...');
  server.listen(exports.port);
}

/**
 * Sends a message
 * @param container {object} target container
 * @param message {object} message (hMessage)
 */
exports.send = function (container, message) {
  logger.makeLog('trace', 'hub-109', 'sending message ' + message.id + ' tcp...');

  events.once('socket|' + container.id, function (err, socket) {
    if (err) {
      logger.makeLog('trace', 'hub-100', 'socket search failed !', err);
      events.emit('drop', message);
    } else {
      logger.makeLog('trace', 'hub-110', 'socket found ! ' + message.id + ' sent tcp !');
      write(socket, {message: message});
    }
  });

  setTimeout(function () {
    events.emit('socket|' + container.id, 'timeout');
  }, socketSearchTimeout);

  if (EventEmitter.listenerCount(events, 'socket|' + container.id) === 1) {
    searchReqSocket(container);
  }
};

/**
 * Message handler has to be overridden (by the container)
 * @param message {object} message (hMessage)
 * @param reply {function} reply callback
 */
exports.onMessage = function (message, reply) {
  events.emit('message', message, reply);
};

/**
 * Handles incomming request
 * @param socket {Socket} client socket
 * @param request {object} incomming request
 */
function onRequest(socket, request) {
  logger.makeLog('trace', 'hub-124', 'request received remotly', {request: request});
  var message = request.message;
  if (actors.exists(message.to, actors.scope.PROCESS)) {
    exports.onMessage(message, function (response) {
      write(socket, {message: response});
    });
  } else {
    logger.makeLog('trace', 'hub-119', 'actor ' + message.to + ' not found !');
    write(socket, {err: 'actor not found !', message: message});
  }
}

/**
 * Handles incomming response
 * @param socket {Socket} client socket
 * @param response {object} incomming response
 */
function onResponse(socket, response) {
  logger.makeLog('trace', 'hub-122', 'response received remotly', {response: response});
  if (response.err) {
    actors.remove(response.message.to);
    events.emit('drop', response.message);
  } else {
    events.emit('response', response.message);
  }
}

/**
 * Finds a socket to reach a container
 * @param container {object} target container
 * @param {function} cb
 */
function searchReqSocket(container) {
  var socket = sockets[container.id];
  if (socket) {
    events.emit('socket|' + container.id, null, socket);
  } else {
    socket = new Socket();
    socket.infos = {onMessage: onResponse};
    sockets[container.id] = socket;

    socket.on('connect', function () {
      logger.makeLog('trace', 'hub-116', 'tcp socket to node ' + container.id + ' connected !');
      events.emit('socket|' + container.id, null, socket);
    });

    socket.on('error', function (err) {
      logger.makeLog('trace', 'hub-121', 'tcp socket to node ' + container.id + ' in error', err);
    });

    socket.on('close', function () {
      logger.makeLog('trace', 'hub-117', 'tcp socket to node ' + container.id + ' closed');
      socket && socket.destroy();
      actors.removeByContainer(container.id);
      delete sockets[container.id];
    });

    socket.on('data', function (buffer) {
      read(socket, buffer);
    });

    socket.connect(container.netInfo.port, container.netInfo.ip);
  }
  return socket;
}

/**
 * Format & write a message in a socket
 * @param socket {Socket} socket
 * @param message {object} message to write
 */
function write(socket, message) {
  var json = JSON.stringify(message);
  var size = Buffer.byteLength(json, 'utf8');
  var buffer = new Buffer(4 + size);
  buffer.writeUInt32BE(size, 0);
  buffer.write(json, 4);
  socket.write(buffer);
}

/**
 * Read an incomming amount of data
 * @param socket {Socket} socket which received data
 * @param chunk {Buffer} data received
 */
function read(socket, chunk) {
  console.log('CHUNK : ' + chunk.length);
  socket.infos.buffer = socket.infos.buffer ? Buffer.concat([socket.infos.buffer, chunk]) : chunk;
  if (socket.infos.buffer.length > 4) {
    var size = socket.infos.buffer.readUInt32BE(0);
    if (socket.infos.buffer.length >= 4 + size) {
      var buffer = socket.infos.buffer.slice(4, 4 + size);
      var data = null;
      try {
        data = JSON.parse(buffer.toString('utf8'));
      } catch (err) {
        logger.makeLog('warn', 'hub-115', 'error parsing incomming tcp message');
      }
      if (data) {
        if (!tv4.validate(data.message, schemas.message)) {
          logger.makeLog('warn', 'hub-123', 'reject invalid message', {err: tv4.error, message: data});
        } else {
          socket.infos.onMessage(socket, data);
        }
      }
      var remainingChunk = socket.infos.buffer.slice(4 + size);
      socket.infos.buffer = null;
      (remainingChunk.length > 0) && read(socket, remainingChunk);
    }
  }
}
