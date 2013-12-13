/**
 * @module hubiquitus
 * Actors container
 */

var _ = require('lodash');
var timers = require('timers');
var EventEmitter = require('events').EventEmitter;
var tv4 = require('tv4');
var actors = require('./actors');
var discovery = require('./discovery');
var logger = require('./logger')('hubiquitus:core:container');
var stats = require('./stats');
var schemas = require('./schemas');
var utils = {
  aid: require('./utils/aid'),
  ip: require('./utils/ip'),
  uuid: require('./utils/uuid')
};

exports.__proto__ = new EventEmitter();
exports.setMaxListeners(0);

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
  ip: utils.ip.resolve(),
  pid: process.pid
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
 * - max research retry : max actor researches before surrend
 * - research timeout : time before stopping research
 */
var properties = {
  'default send timeout': 30000,
  'max send timeout': 5 * 60000,
  'retry delay': 10,
  'trace stats': false,
  'max research retry': 30,
  'research timeout': 30000
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

exports.on('actor added', function (aid) {
  events.emit(aid + '!found', aid);
  events.emit(utils.aid.bare(aid) + '!found', aid);
});

/**
 * @type {object}
 */
var adapters = {
  inproc: require('./adapters/inproc'),
  remote: require('./adapters/remote')
};
adapters.inproc.on('req', onReq);
adapters.remote.on('req', onReq);
adapters.inproc.on('res', function (res) {
  events.emit('res|' + res.id, res);
});
adapters.remote.on('res', function (res) {
  events.emit('res|' + res.id, res);
});
adapters.remote.on('drop', onDrop);

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
 * @param params {object|function} parameters - callback if function
 * @param cb {function} callback
 * @returns {object} module reference
 */
exports.start = function (params, cb) {
  if (locked || started) {
    var msg = locked ? 'busy' : 'already started';
    logger.makeLog('warn', 'hub-17', 'attempt to start container while ' + msg + ' !');
    return this;
  }

  if (_.isFunction(params)) {
    cb = params;
    params = null;
  }

  locked = true;
  logger.makeLog('trace', 'hub-16', 'starting container...');

  params = params || {};
  if (!tv4.validate(params, schemas.startParams)) {
    var err = logger.makeLog('warn', 'hub-43', 'attempt to start container using invalid params', null, tv4.error);
    cb && cb({code: 'TECHERR', cause: err});
    return this;
  }

  if (params.ip) exports.netInfo.ip = params.ip;
  if (properties['trace stats'] = (params.stats && params.stats['enabled'] === 'true')) {
    setImmediate(stats.start, params.stats);
  }

  adapters.remote.start(function () {
    exports.netInfo.port = adapters.remote.port;
    var discoveryParams = {addr: params.discoveryAddr, port: params.discoveryPort};
    discovery.start(discoveryParams, function () {
      started = true;
      locked = false;
      logger.makeLog('info', 'hub-18', 'container started !', {netInfo: exports.netInfo});
      cb && setImmediate(cb);
      setImmediate(processStartingQueue);
    });
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
    var msg = locked ? 'busy' : 'already stopped';
    logger.makeLog('warn', 'hub-37', 'attempt to stop container while ' + msg + ' !');
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
 * @param timeout {number|function} timeout - callback if function
 * @param cb {function} callback
 * @returns {object} module reference
 */
exports.send = function (from, to, content, timeout, cb) {
  if (_.isFunction(timeout)) {
    cb = timeout;
    timeout = properties['default send timeout'];
  }

  if (started) {
    var req = {from: from, to: to, content: content, id: utils.uuid(), date: new Date().getTime()};
    req.timeout = timeout || properties['max send timeout'];
    if (cb) req.cb = true;
    if (!tv4.validate(req, schemas.message) || (cb && !_.isFunction(cb))) {
      var err = logger.makeLog('warn', 'hub-29', 'attempt to send an invalid request', null, {req: req});
      cb && cb({code: 'TECHERR', cause: err});
      return this;
    }

    processMiddlewares(msgType.REQ_OUT, req, cb, function () {
      if (cb) {
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
  searchActor(req.to, function (aid) {
    if (new Date().getTime() < (req.date + req.timeout)) {
      req.to = aid;
      var actor = actors.get(aid);
      if (!actor) onDrop(req);
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
  logger.makeLog('trace', 'hub-25', 'processing response', {res: res});
  processMiddlewares(msgType.RES_IN, res, null, function () {
    setImmediate(function () {
      try {
        cb && cb(res.err, res);
      } catch (err) {
        logger.makeLog('warn', 'hub-31', 'response processing error', {res: res, err: err});
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
 * @param {string} aid
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
  actors.add(actor, actors.scope.PROCESS);
  return this;
};

/**
 * Removes an actor
 * @param {string} aid
 */
exports.removeActor = function (aid) {
  if (!utils.aid.isValid(aid)) {
    logger.makeLog('warn', 'hub-4', 'attempt to remove an actor using an invalid aid !', aid);
    return this;
  }

  actors.remove(aid, actors.scope.PROCESS);
  return this;
};

/**
 * Search for an actor
 * @param aid {string}
 * @param cb {function}
 */
function searchActor(aid, cb) {
  logger.makeLog('trace', 'hub-20', 'searching actor ' + aid + '...');
  events.once(aid + '!found', cb);

  var cacheAid = actors.pick(aid);
  if (cacheAid) {
    logger.makeLog('trace', 'hub-42', 'actor ' + cacheAid + ' found in cache !');
    events.emit(aid + '!found', cacheAid);
  }

  discovery.notifySearched(aid);
}

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
