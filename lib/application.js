/**
 * @module hubiquitus
 * Actors container
 */

var _ = require('lodash');
var timers = require('timers');
var EventEmitter = require('events').EventEmitter;
var tv4 = require('tv4');

var properties = require('./properties');
var actors = require('./actors');
var discovery = require('./discovery');
var logger = require('./logger')('hubiquitus:core:container');
var schemas = require('./schemas');
var utils = {
  aid: require('./utils/aid'),
  ip: require('./utils/ip'),
  uuid: require('./utils/uuid')
};

exports.__proto__ = new EventEmitter();
exports.setMaxListeners(0);

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
 * @type {object}
 */
var adapters = {
  inproc: require('./adapters/inproc'),
  remote: require('./adapters/remote')
};

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
 * Listeners setup
 */
actors.on('actor added', function (aid, scope) {
  events.emit(aid + '!found', aid);
  events.emit(utils.aid.bare(aid) + '!found', aid);
  exports.emit('actor added', aid, scope);
});

actors.on('actor removed', function (aid, scope) {
  exports.emit('actor removed', aid, scope);
});

adapters.inproc.on('req', onReq);

adapters.remote.on('req', onReq);

adapters.inproc.on('res', function (res) {
  events.emit('res|' + res.id, res);
});

adapters.remote.on('res', function (res) {
  events.emit('res|' + res.id, res);
});

adapters.remote.on('drop', function (req) {
  events.emit('drop|' + req.id, req);
});

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

  if (params.ip) properties.netInfo.ip = params.ip;

  adapters.remote.start(function () {
    var discoveryParams = {addr: params.discoveryAddr, port: params.discoveryPort};
    discovery.start(discoveryParams, function () {
      started = true;
      locked = false;
      logger.makeLog('info', 'hub-18', 'container started !');
      _.isFunction(cb) && setImmediate(cb);
      processStartingQueue();
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
  logger.makeLog('trace', 'hub-52', 'stopping container...');
  discovery.stop();
  adapters.remote.stop(function () {
    logger.makeLog('info', 'hub-36', 'container stopped !');
    started = false;
    locked = false;
    _.isFunction(cb) && setImmediate(cb);
  });

  return this;
};

/**
 * Sends a request
 * @param from {string} sender aid
 * @param to {string} receiver aid
 * @param [content] {object} request
 * @param [timeout] {number|function|object} timeout - callback if function
 * @param [cb] {function|object} callback
 * @param [headers] {object} headers
 * @returns {object} module reference
 */
exports.send = function (from, to, content, timeout, cb, headers) {
  if (_.isFunction(timeout)) {
    headers = cb;
    cb = timeout;
    timeout = properties.sendDefaultTimeout;
  } else if (_.isObject(timeout)) {
    headers = timeout;
    timeout = null;
  } else if (!_.isFunction(cb)) {
    headers = cb;
    cb = null;
  }

  if (started) {
    var req = {from: from, to: to, content: content, id: utils.uuid(), date: Date.now(), headers: headers || {}};
    req.timeout = timeout || properties.sendMaxTimeout;
    if (cb) req.cb = true;
    if (!tv4.validate(req, schemas.message) || (cb && !_.isFunction(cb))) {
      var err = logger.makeLog('warn', 'hub-29', 'attempt to send an invalid request', null, {req: req, cause: tv4.error});
      cb && cb({code: 'TECHERR', cause: err});
      return this;
    }

    processMiddlewares(msgType.REQ_OUT, req, cb, function () {
      if (cb) {
        events.once('res|' + req.id, function (res) {
          onRes(res, cb);
        });
        events.on('drop|' + req.id, function () {
          onDrop(req); // do not use the 'req' from the arguments to keep the original 'to'
        });
        setTimeout(function () {
          events.emit('res|' + req.id, {err: {code: 'TIMEOUT'}, id: req.id});
          events.removeAllListeners('drop|' + req.id);
        }, req.timeout);
      }
      internalSend(req);
    });
  } else {
    logger.makeLog('trace', 'hub-46', 'container not started : queueing request');
    startingQueue.push({from: from, to: to, content: content, timeout: timeout, cb: cb, headers: headers});
  }
  return this;
};

/**
 * Internal send : find actor & send request
 * @param req {object} formated request to be sent
 */
function internalSend(req) {
  searchActor(req.to, req.timeout, function (aid) {
    if (Date.now() < (req.date + req.timeout)) {
      var actor = actors.get(aid);
      if (!actor) return onDrop(req);
      req.to = aid;
      if (actor.scope === actors.scope.PROCESS) {
        logger.makeLog('trace', 'hub-2', 'sending request inproc...', {req: req});
        adapters.inproc.send(req);
      } else if (actor.scope === actors.scope.LOCAL) {
        logger.makeLog('trace', 'hub-15', 'sending request to another container ipc...', {req: req});
        adapters.remote.send(actor.container, req);
      } else if (actor.scope === actors.scope.REMOTE) {
        logger.makeLog('trace', 'hub-48', 'sending request to another container...', {req: req});
        adapters.remote.send(actor.container, req);
      }
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
  var actor = actors.get(req.to, actors.scope.PROCESS);

  var inMiddleware;
  var replyWrapper = function (err, content) {
    var res = {from: actor.id, to: req.from, err: err, content: content, date: req.date, id: req.id, headers: req.headers};
    logger.makeLog('trace', 'hub-53', 'sending response...', {res: res});
    if (inMiddleware) {
      reply(res);
    } else {
      processMiddlewares(msgType.RES_OUT, res, null, function () {
        reply(res);
      });
    }
  };

  inMiddleware = true;
  processMiddlewares(msgType.REQ_IN, req, replyWrapper, function () {
    inMiddleware = false;
    setImmediate(function () {
      try {
        req.reply = replyWrapper;
        actor.onMessage(req);
      } catch (err) {
        logger.makeLog('warn', 'hub-30', 'request processing error', {req: req, err: err});
      }
    });
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
  logger.makeLog('trace', 'hub-26', 'request ' + req.id + ' dropped', {req: req});
  if (Date.now() < (req.date + req.timeout)) {
    setTimeout(function () {
      logger.makeLog('trace', 'hub-27', 'resending request ' + req.id, {req: req});
      internalSend(req);
    }, properties.sendRetryDelay);
  } else {
    logger.makeLog('trace', 'hub-28', 'timeout reached, ' + req.id + ' definitely dropped', {req: req});
  }
}

/**
 * Sends starting queue requests
 */
function processStartingQueue() {
  logger.makeLog('trace', 'hub-19', 'processing starting queue (' + startingQueue.length + ' items)');
  _.forEach(startingQueue, function (req) {
    setImmediate(function () {
      exports.send(req.from, req.to, req.content, req.timeout, req.cb, req.headers);
    });
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
      setImmediate(function () {
        try {
          middlewares[index++](type, msg, next);
        } catch (err) {
          logger.makeLog('warn', 'hub-10', 'middleware processing error', {err: err});
        }
      });
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

  var actor = scope || {};
  actor.onMessage = actor.onMessage || function(){};
  actor.id = aid;
  actor.container = {id: properties.ID, name: properties.name, netInfo: properties.netInfo};
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
 * @returns {object} module reference
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
 * @param {number} timeout
 * @param cb {function}
 */
function searchActor(aid, timeout, cb) {
  logger.makeLog('trace', 'hub-20', 'searching actor ' + aid + '...');

  // loop to remind discovery of actor research
  var remindDiscovery;

  // scheduled task to cancel reminder & research at request timeout
  var searchTimeout;

  // when actor is found, we stop the reminder and the timeout task
  function onFound(resAid) {
    logger.makeLog('trace', 'hub-42', 'actor ' + resAid + ' found !');
    remindDiscovery && clearInterval(remindDiscovery);
    searchTimeout && clearTimeout(searchTimeout);
    cb && cb(resAid);
  }

  events.once(aid + '!found', onFound);

  searchTimeout = setTimeout(function () {
    logger.makeLog('trace', 'hub-50', 'req needing ' + aid + ' timeout !');
    remindDiscovery && clearInterval(remindDiscovery);
    events.removeListener(aid + '!found', onFound);
  }, timeout);

  // notify discovery
  discovery.notifySearched(aid);

  // search in cache
  var cacheAid = actors.pick(aid);
  if (cacheAid) {
    events.emit(aid + '!found', cacheAid);
  } else {
    remindDiscovery = setInterval(function () {
      discovery.notifySearched(aid);
    }, properties.discoveryRemind);
  }
}

/**
 * Set hubiquitus properties
 * @param key
 * @param value
 * @returns {object} module reference
 */
exports.set = function (key, value) {
  if (!_.isString(key)) {
    return this;
  }

  switch (key) {
    case 'discoveryAddrs':
      discovery.setDiscoveryAddrs(value);
      break;
    default:
      properties[key] = value;
  }

  return this;
};
