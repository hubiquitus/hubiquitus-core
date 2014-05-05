/**
 * @module remote adapter
 */

var net = require('net');
var Socket = net.Socket;
var _ = require('lodash');
var tv4 = require('tv4');
var EventEmitter = require('events').EventEmitter;

var properties = require('../properties');
var logger = require('../logger')('hubiquitus:core:adapter:remote');
var actors = require('../actors');
var cache = require('../cache');
var schemas = require('../schemas');

exports.__proto__ = new EventEmitter();
exports.setMaxListeners(0);

/**
 * @type {number}
 */
exports.port = null;

/**
 * @type {boolean}
 */
var started = false;

/**
 * @type {boolean}
 */
var locked = false;

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
 * Starts connection & binding
 * @param {function} done
 */
exports.start = function (done) {
  if (locked || started) {
    var msg = locked ? 'busy' : 'already started';
    return logger.makeLog('warn', 'hub-111', 'attempt to start tcp adapter while ' + msg + ' !');
  }

  locked = true;
  exports.once('server listenning', function () {
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
    return logger.makeLog('warn', 'hub-114', 'attempt to stop tcp adapter while ' + msg + ' !');
  }

  locked = true;
  exports.once('server closed', function () {
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
    properties.container.port = exports.port;
    exports.emit('server listenning');
  });

  server.on('close', function () {
    logger.makeLog('trace', 'hub-104', 'tcp server sock closed !');
    exports.emit('server closed');
  });

  server.on('connection', function (sock) {
    sock.infos = {handler: onReq};


    sock.on('error', function (err) {
      logger.makeLog('trace', 'hub-127', 'incomming tcp sock in error', err);
    });

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

  exports.once('sock|' + container.id, function (err, sock) {
    if (err) {
      logger.makeLog('trace', 'hub-100', 'sock search failed !', err);
      exports.emit('drop', req);
    } else {
      logger.makeLog('trace', 'hub-110', 'sock found ! ' + req.id + ' sent tcp !');
      exports.emit('req sent', req);
      write(sock, null, req);
    }
  });

  setTimeout(function () {
    exports.emit('sock|' + container.id, {code: 'TIMEOUT'});
  }, sockSearchTimeout);

  if (EventEmitter.listenerCount(exports, 'sock|' + container.id) === 1) {
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
  if (actors.exists(req.to)) {
    exports.emit('req received', req);
    exports.emit('req', req, function (res) {
      if (req.cb) {
        exports.emit('res sent', req);
        write(sock, null, res);
      }
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
    cache.remove(res.to);
    exports.emit('drop', res);
  } else {
    exports.emit('res received', res);
    exports.emit('res', res);
  }
}

/**
 * Finds a sock to reach a container
 * @param container {object} target container
 */
function searchReqSock(container) {
  var sock = socks[container.id];
  if (sock) {
    exports.emit('sock|' + container.id, null, sock);
  } else {
    sock = new Socket();
    sock.infos = {handler: onRes};
    socks[container.id] = sock;

    sock.on('connect', function () {
      logger.makeLog('trace', 'hub-116', 'tcp sock to node ' + container.id + ' connected !');
      exports.emit('sock|' + container.id, null, sock);
    });

    sock.on('error', function (err) {
      logger.makeLog('trace', 'hub-121', 'tcp sock to node ' + container.id + ' in error', err);
    });

    sock.on('close', function () {
      logger.makeLog('trace', 'hub-117', 'tcp sock to node ' + container.id + ' closed');
      sock && sock.destroy();
      cache.removeContainer(container.id);
      delete socks[container.id];
    });

    sock.on('data', function (buffer) {
      read(sock, buffer);
    });

    sock.connect(container.port, container.ip);
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
  try {
    sock.write(buffer);
  } catch (err) {
    logger.makeLog('warn', 'hub-126', 'error writing on socket', {data: data});
  }
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
