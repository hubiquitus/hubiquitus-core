/**
 * @module hubiquitus
 * Actors container
 */

var _ = require('lodash');
var timers = require('timers');
var EventEmitter = require('events').EventEmitter;
var actors = require('./actors');
var discovery = require('./discovery');
var logger = require('./logger')('hubiquitus:core:container');
var stats = require('./stats');
var utils = {
  aid: require('./utils/aid'),
  ip: require('./utils/ip'),
  uuid: require('./utils/uuid')
};

/**
 * @type {object}
 */
const _this = module.exports;

/**
 * @type {string}
 */
const ID = exports.ID = utils.uuid();

/**
 * @type {object}
 */
exports.netInfo = {
  ip: utils.ip.resolve()
};

/**
 * @type {boolean}
 */
var started = false;

/**
 * @type {boolean}
 */
var locked = false;

/**
 * @type {Array}
 * Starting queue holds requests sent before the container was started.
 */
var startingQueue = [];

/**
 * @type {object}
 * Hubiquitus properties
 * - default send timeout : in ms, used when an aswer is expected
 * - max send timeout : im ms, max time window to send a request if no timeout and no callback is provided
 * - trace stats : true if internal monitoring is enabled
 */
var properties = {
  'default send timeout': 30000,
  'max send timeout': 5 * 3600000,
  'retry delay': 10,
  'trace stats': false
};

/**
 * @type {Array}
 */
var middlewares = [];

/**
 * @type {EventEmitter}
 * Internal event emitter
 */
var events = new EventEmitter();
events.setMaxListeners(0);

/**
 * @type {EventEmitter}
 * Public event emitter
 */
exports.events = new EventEmitter();
exports.events.setMaxListeners(0);

/**
 * @type {object}
 */
var adapters = {
  inproc: require('./adapters/inproc'),
  remote: require('./adapters/remote')
};
adapters.inproc.events.on('req', onReq);
adapters.remote.events.on('req', onReq);
adapters.inproc.events.on('res', function (res) {
  events.emit('res|' + res.id, res);
});
adapters.remote.events.on('res', function (res) {
  events.emit('res|' + res.id, res);
});
adapters.remote.events.on('drop', onDrop);

/**
 * @enum {string}
 */
const msgType = {
  REQ_OUT: 'req_out',
  REQ_IN: 'req_in',
  RES_OUT: 'res_out',
  RES_IN: 'res_in'
};

/**
 * Starts container
 * Can be called at any time : requests are queued until the container starts
 * @param params {object} parameters
 * @param cb {function} callback
 * @returns {object} module reference
 */
exports.start = function (params, cb) {
  if (locked || started) {
    logger.makeLog('warn', 'hub-17', 'attempt to start container while already started !');
    return this;
  }

  locked = true;
  logger.makeLog('trace', 'hub-16', 'starting container...');
  params = params || {};
  exports.netInfo.pid = process.pid;
  if (params.ip) exports.netInfo.ip = params.ip;
  if (properties['trace stats'] = (params.stats && params.stats['enabled'] === 'true')) {
    setImmediate(stats.start, params.stats);
  }

  adapters.remote.start(function () {
    exports.netInfo.port = adapters.remote.port;
    if (params.discoveryAddr || params.discoveryPort) discovery.start(params.discoveryAddr, params.discoveryPort);
    started = true;
    locked = false;
    logger.makeLog('info', 'hub-18', 'container started !', {netInfo: exports.netInfo});
    if (_.isFunction(cb)) setImmediate(cb);
    setImmediate(processStartingQueue);
  });

  return this;
};

/**
 * Stops container
 * @param cb {function} callback
 * @returns {object} module reference
 */
exports.stop = function (cb) {
  if (locked || !started) {
    logger.makeLog('warn', 'hub-37', 'attempt to stop container while already stopped !');
    return this;
  }

  locked = true;
  logger.makeLog('trace', 'hub-16', 'stopping container...');
  stats.stop();
  discovery.stop();
  adapters.remote.stop(function () {
    logger.makeLog('info', 'hub-36', 'container stopped !');
    started = false;
    locked = false;
    if (_.isFunction(cb)) setImmediate(cb);
  });

  return this;
};

/**
 * Sends a request
 * @param from {string} sender aid
 * @param to {string} receiver aid
 * @param content {object} request
 * @param timeout {number} timeout
 * @param cb {function} callback
 * @returns {object} module reference
 */
exports.send = function (from, to, content, timeout, cb) {
  if (_.isFunction(timeout)) {
    cb = timeout;
    timeout = properties['default send timeout'];
  }

  var errors = [];
  if (!_.isString(from)) errors.push('from parameter is not a valid aid');
  if (!_.isString(to)) errors.push('to parameter is not a valid aid');
  if (!_.isUndefined(timeout) && !_.isNull(timeout) && !_.isNumber(timeout))
    errors.push('timeout parameter is not valid');
  if (!_.isUndefined(cb) && !_.isNull(cb) && !_.isFunction(cb))
    errors.push('cb parameter is not valid');
  if (!_.isEmpty(errors)) {
    var err = logger.makeLog('warn', 'hub-29', 'hubiquitus send invoked with invalid parameters', {
      err: errors,
      args: {from: from, to: to, content: content, timeout: timeout, cb: cb}
    }, errors);
    cb && cb(err);
    return this;
  }

  if (started) {
    var req = {from: from, to: to, content: content, id: utils.uuid(), date: new Date().getTime()};
    req.timeout = timeout || properties['max send timeout'];
    if (cb) req.cb = true;
    processMiddlewares(msgType.REQ_OUT, req, cb, function () {
      if (_.isFunction(cb)) {
        events.once('res|' + req.id, function (res) {
          onRes(res, cb);
        });
        setTimeout(function () {
          events.emit('res|' + req.id, {err: {code: 'TIMEOUT'}});
        }, req.timeout);
      }
      internalSend(req);
    });
  } else {
    startingQueue.push({from: from, to: to, content: content, timeout: timeout, cb: cb});
  }
  return this;
};

/**
 * Internal send : find actor & send request
 * @param req {object} formated request to be sent
 */
function internalSend(req) {
  discovery.search(req.to, function (aid) {
    if (new Date().getTime() < (req.date + req.timeout)) {
      req.to = aid;
      var actor = actors.get(aid);
      if (actor.scope === actors.scope.PROCESS) {
        logger.makeLog('trace', 'hub-2', 'sending request inproc...', {req: req});
        adapters.inproc.send(req);
      } else if (actor.scope === actors.scope.LOCAL) {
        logger.makeLog('trace', 'hub-15', 'sending request to another container ipc...', {req: req});
        adapters.remote.send(actor.container, req);
      } else if (actor.scope === actors.scope.REMOTE) {
        logger.makeLog('trace', 'hub-15', 'sending request to another container...', {req: req});
        adapters.remote.send(actor.container, req);
      }
      if (properties['trace stats']) setImmediate(stats.count, req.from, req.to);
    }
  });
}

/**
 * Incomming request processing
 * @param req {object} request (hMessage)
 * @param reply {function}
 */
function onReq(req, reply) {
  logger.makeLog('trace', 'hub-3', 'processing request', {req: req});
  processMiddlewares(msgType.REQ_IN, req, reply, function () {
    var actor = actors.get(req.to, actors.scope.PROCESS);
    if (!actor) {
      logger.makeLog('error', 'hub-22', 'actor ' + req.to + ' not found');
    } else {
      setImmediate(function () {
        try {
          req.reply = function (err, content) {
            var res = {from: actor.id, to: req.from, err: err, content: content, id: req.id};
            logger.makeLog('trace', 'hub-34', 'sending response...', {res: res});
            processMiddlewares(msgType.RES_OUT, res, null, function () {
              reply(res);
            });
          };
          actor.onMessage(req);
        } catch (err) {
          logger.makeLog('warn', 'hub-30', 'request processing error', {req: req, err: err});
        }
      });
    }
  });
}

/**
 * Incomming response processing
 * @param res {object} formated response
 * @param cb {function} original send callback
 */
function onRes(res, cb) {
  logger.makeLog('trace', 'hub-25', 'processing response', {response: res});
  processMiddlewares(res, msgType.RES_IN, null, function () {
    setImmediate(function () {
      try {
        cb && cb(res.err, res);
      } catch (err) {
        logger.makeLog('warn', 'hub-31', 'response processing error', {response: res, err: err});
      }
    });
  });
}

/**
 * Message drop handler
 * @param req {object} request to be processed
 */
function onDrop(req) {
  logger.makeLog('trace', 'hub-26', 'request ' + req.id + ' dropped');
  if (new Date().getTime() < (req.date + req.timeout)) {
    logger.makeLog('trace', 'hub-27', 'resending request ' + req.id);
    setTimeout(function () {
      internalSend(req);
    }, properties['retry delay']);
  } else {
    logger.makeLog('trace', 'hub-28', 'timeout reached, ' + req.id + ' definitely dropped');
  }
}

/**
 * Sends starting queue requests
 */
function processStartingQueue() {
  logger.makeLog('trace', 'hub-19', 'processing starting queue (' + startingQueue.length + ' items)');
  _.forEach(startingQueue, function (req) {
    setImmediate(exports.send, req.from, req.to, req.content, req.cb);
  });
  startingQueue = [];
}

/**
 * Declare a middleware
 * @param fn {function} middleware
 */
exports.use = function (fn) {
  _.isFunction(fn) && middlewares.push(fn);
  return this;
};

/**
 * Process middlewares
 * @param msg {object} request to pass through the middlewares
 * @param type {string} request type
 * @param reply {function} reply function
 * @param cb {function} callback
 */
function processMiddlewares(type, msg, reply, cb) {
  var index = 0;
  var count = middlewares.length;
  msg.reply = reply;
  (function next() {
    if (index < count) {
      middlewares[index++](type, msg, next);
    } else {
      delete msg.reply;
      cb && cb();
    }
  })();
}

/**
 * Adds an actor to the container
 * @param aid {string} aid
 * @param onMessage {function} actor handler
 * @param [scope] {object} scope
 * @returns {object} module reference
 */
exports.addActor = function (aid, onMessage, scope) {
  if (!utils.aid.isValid(aid)) {
    logger.makeLog('warn', 'hub-1', 'attempt to add an actor using an invalid id !', aid);
    return this;
  }

  if (utils.aid.isBare(aid)) aid += '/' + utils.uuid();
  var actor = scope || {};
  actor.id = aid;
  actor.container = {id: ID, netInfo: exports.netInfo};
  actor.onMessage = onMessage.bind(actor);
  actor.send = function (to, content, timeout, cb) {
    exports.send(aid, to, content, timeout, cb);
  };
  actors.add(actor);
  return this;
};

/**
 * Removes an actor
 * @param aid {string} aid
 */
exports.removeActor = function (aid) {
  if (!utils.aid.isValid(aid)) {
    logger.makeLog('warn', 'hub-4', 'attempt to remove an actor using an invalid aid !', aid);
    return this;
  }

  actors.remove(aid);
  return this;
};

/**
 * Set hubiquitus properties
 * @param key
 * @param value
 */
exports.set = function (key, value) {
  if (!_.isString(key)) return;
  if (key = 'discoveryAddrs') {
    discovery.setDiscoveryAddrs(value);
  } else {
    properties[key] = value;
  }
};

/**
 * Schedule the immediate execution of the callback after I/O events
 * @param {function} callback
 */
function setImmediate(callback) {
  if (!callback) throw new Error('callback is undefined');
  var args = Array.prototype.slice.call(arguments, 1);
  timers.setImmediate(function () {
    callback.apply(_this, args);
  });
}
