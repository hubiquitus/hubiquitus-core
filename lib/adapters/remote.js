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
var started = false;

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
var socks = {};

/**
 * @type {number}
 */
var sockSearchTimeout = 1000;

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
  if (locked || started) {
    var msg = locked ? 'busy' : 'already started';
    return logger.makeLog('warn', 'hub-111', 'try to start tcp adapter while ' + msg + ' !');
  }

  locked = true;
  events.once('server listenning', function () {
    logger.makeLog('trace', 'hub-106', 'tcp adapter started !');
    started = true;
    locked = false;
    done();
  });
  listen();
};

/**
 * Stops connection & binding
 * @param {function} done
 */
exports.stop = function (done) {
  if (locked || !started) {
    var msg = locked ? 'busy' : 'already stopped';
    return logger.makeLog('warn', 'hub-114', 'try to stop tcp adapter while ' + msg + ' !');
  }

  locked = true;
  events.once('server closed', function () {
    logger.makeLog('trace', 'hub-108', 'tcp adapter stopped !');
    started = false;
    locked = false;
    done();
  });
  server.close();
};

/**
 * Starts server sock
 */
function listen() {
  server = net.createServer();

  server.on('error', function (err) {
    logger.makeLog('trace', 'hub-103', 'tcp server sock failed to listen on port ' + exports.port, err);
    listen();
  });

  server.on('listening', function () {
    logger.makeLog('trace', 'hub-105', 'tcp server sock listenning on port ' + exports.port + ' !');
    h.netInfo.port = exports.port;
    events.emit('server listenning');
  });

  server.on('close', function () {
    logger.makeLog('trace', 'hub-104', 'tcp server sock closed !');
    events.emit('server closed');
  });

  server.on('connection', function (sock) {
    sock.infos = {handler: onReq};
    sock.on('data', function (buffer) {
      read(sock, buffer);
    });
  });

  exports.port = _.random(3000, 30000);
  logger.makeLog('trace', 'hub-101', 'tcp server sock tries to listen on port ' + exports.port + '...');
  server.listen(exports.port);
}

/**
 * Sends a message
 * @param container {object} target container
 * @param req {object} message (hMessage)
 */
exports.send = function (container, req) {
  if (!started) {
    return logger.makeLog('warn', 'hub-125', 'cant send message ' + req.id + '; tcp adapter not started !');
  }

  logger.makeLog('trace', 'hub-109', 'sending message ' + req.id + ' tcp...');

  events.once('sock|' + container.id, function (err, sock) {
    if (err) {
      logger.makeLog('trace', 'hub-100', 'sock search failed !', err);
      events.emit('drop', req);
    } else {
      logger.makeLog('trace', 'hub-110', 'sock found ! ' + req.id + ' sent tcp !');
      write(sock, null, req);
    }
  });

  setTimeout(function () {
    events.emit('sock|' + container.id, 'timeout');
  }, sockSearchTimeout);

  if (EventEmitter.listenerCount(events, 'sock|' + container.id) === 1) {
    searchReqSock(container);
  }
};

/**
 * Handles incomming request
 * @param sock {Socket} client sock
 * @param err {*} technical error
 * @param req {object} incomming request
 */
function onReq(err, sock, req) {
  logger.makeLog('trace', 'hub-124', 'request received remotly', {req: req});
  if (actors.exists(req.to, actors.scope.PROCESS)) {
    events.emit('req', req, function (res) {
      req.cb && write(sock, null, res);
    });
  } else {
    logger.makeLog('trace', 'hub-119', 'actor ' + req.to + ' not found !');
    write(sock, 'actor not found !', req);
  }
}

/**
 * Handles incomming response
 * @param sock {Socket} client sock
 * @param err {*} technical error
 * @param res {object} incomming response
 */
function onRes(err, sock, res) {
  logger.makeLog('trace', 'hub-122', 'response received remotly', {res: res});
  if (err) {
    actors.remove(res.to);
    events.emit('drop', res);
  } else {
    events.emit('res', res);
  }
}

/**
 * Finds a sock to reach a container
 * @param container {object} target container
 */
function searchReqSock(container) {
  var sock = socks[container.id];
  if (sock) {
    events.emit('sock|' + container.id, null, sock);
  } else {
    sock = new Socket();
    sock.infos = {handler: onRes};
    socks[container.id] = sock;

    sock.on('connect', function () {
      logger.makeLog('trace', 'hub-116', 'tcp sock to node ' + container.id + ' connected !');
      events.emit('sock|' + container.id, null, sock);
    });

    sock.on('error', function (err) {
      logger.makeLog('trace', 'hub-121', 'tcp sock to node ' + container.id + ' in error', err);
    });

    sock.on('close', function () {
      logger.makeLog('trace', 'hub-117', 'tcp sock to node ' + container.id + ' closed');
      sock && sock.destroy();
      actors.removeByContainer(container.id);
      delete socks[container.id];
    });

    sock.on('data', function (buffer) {
      read(sock, buffer);
    });

    sock.connect(container.netInfo.port, container.netInfo.ip);
  }
  return sock;
}

/**
 * Format & write a message in a sock
 * @param sock {Socket} sock
 * @param err {*} technical error
 * @param msg {object} message to write
 */
function write(sock, err, msg) {
  var data = {err: err, msg: msg};
  var json = JSON.stringify(data);
  var size = Buffer.byteLength(json, 'utf8');
  var buffer = new Buffer(4 + size);
  buffer.writeUInt32BE(size, 0);
  buffer.write(json, 4);
  sock.write(buffer);
}

/**
 * Read an incomming amount of data
 * @param sock {Socket} sock which received data
 * @param chunk {Buffer} data received
 */
function read(sock, chunk) {
  sock.infos.buffer = sock.infos.buffer ? Buffer.concat([sock.infos.buffer, chunk]) : chunk;
  if (sock.infos.buffer.length > 4) {
    var size = sock.infos.buffer.readUInt32BE(0);
    if (sock.infos.buffer.length >= 4 + size) {
      var buffer = sock.infos.buffer.slice(4, 4 + size);
      var data = null;
      try {
        data = JSON.parse(buffer.toString('utf8'));
      } catch (err) {
        logger.makeLog('warn', 'hub-115', 'error parsing incomming tcp message');
      }
      if (data) {
        if (data.err) {
          sock.infos.handler(data.err, sock, data.msg);
        } else {
          if (!tv4.validate(data.msg, schemas.message)) {
            logger.makeLog('warn', 'hub-123', 'reject invalid message', {err: tv4.error, msg: data.msg});
          } else {
            sock.infos.handler(null, sock, data.msg);
          }
        }
      }
      var remainingChunk = sock.infos.buffer.slice(4 + size);
      sock.infos.buffer = null;
      (remainingChunk.length > 0) && read(sock, remainingChunk);
    }
  }
}
