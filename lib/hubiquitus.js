/**
 * @module hubiquitus
 * Actors container
 */

var _ = require('lodash');
var timers = require('timers');
var EventEmitter = require('events').EventEmitter;
var actors = require('./actors');
var discovery = require('./discovery');
var logger = require('./logger');
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
 * @type {Array}
 * Starting queue holds messages sent before the container was started.
 */
var startingQueue = [];

/**
 * @type {object}
 * Hubiquitus properties
 * - default send timeout : in ms, used when an aswer is expected
 * - max send timeout : im ms, max time window to send a message if no timeout and no callback is provided
 * - trace stats : true if internal monitoring is enabled
 */
var properties = {
  'default send timeout': 30000,
  'max send timeout': 5 * 3600000,
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
adapters.inproc.events.on('message', onMessage);
adapters.remote.events.on('message', onMessage);
adapters.inproc.events.on('response', function (response) {
  events.emit('response|' + response.id, response)
});
adapters.remote.events.on('response', function (response) {
  events.emit('response|' + response.id, response)
});
adapters.remote.events.on('drop', onDrop);

/**
 * @enum {string}
 */
const messageType = {
  OUT: 'out',
  IN: 'in',
  REPLY_OUT: 'reply_out',
  REPLY_IN: 'reply_in'
};

/**
 * Starts container
 * Can be called at any time : messages are queued until the container starts
 * @param params {object} parameters
 * @param cb {function} callback
 * @returns {object} module reference
 */
exports.start = function (params, cb) {
  if (started) {
    logger.makeLog('warn', 'hub-17', 'attempt to start container while already started !');
    return this;
  }

  logger.makeLog('trace', 'hub-16', 'starting container...');
  params = params || {};
  exports.netInfo.pid = process.pid;
  if (params.ip) exports.netInfo.ip = params.ip;
  if (properties['trace stats'] = (params.stats && params.stats['enabled'] === 'true'))
    setImmediate(stats.start, params.stats);

  adapters.remote.start(function () {
    exports.netInfo.port = adapters.remote.port;
    if (params.discoveryAddr || params.discoveryPort) discovery.start(params.discoveryAddr, params.discoveryPort);
    logger.makeLog('info', 'hub-18', 'container started !', {netInfo: exports.netInfo});
    started = true;
    if (_.isFunction(cb)) setImmediate(cb);
    setImmediate(processStartingQueue);
  });

  return this;
};

/**
 * Sends a message
 * @param from {string} sender aid
 * @param to {string} receiver aid
 * @param content {object} message
 * @param timeout {number} timeout
 * @param cb {function} callback
 * @returns {object} module reference
 */
exports.send = function (from, to, content, timeout, cb) {
  if (_.isFunction(timeout)) { cb = timeout; timeout = properties['default send timeout']; }

  content = content || {};
  var errors = [];
  if (!_.isString(from)) errors.push('from parameter is not a valid aid');
  if (!_.isString(to)) errors.push('to parameter is not a valid aid');
  if (!_.isUndefined(timeout) && !_.isNull(timeout) && !_.isNumber(timeout))
    errors.push('timeout parameter is not valid');
  if (!_.isUndefined(cb) && !_.isNull(cb) && !_.isFunction(cb))
    errors.push('cb parameter is not valid');
  if (!_.isEmpty(errors)) {
    var err = logger.makeLog('warn', 'hub-29', 'hubiquitus send invoked with invalid parameters', null, errors);
    cb && cb(err);
    return this;
  }

  if (started) {
    var message = {from: from, to: to, payload: {content: content}, id: utils.uuid(), date: new Date().getTime()};
    message.timeout = timeout || properties['max send timeout'];
    processMiddlewares(message, messageType.OUT, cb, function () {
      if (_.isFunction(cb)) {
        events.once('response|' + message.id, function (response) {
          onResponse(response, cb);
        });
        setTimeout(function () {
          events.emit('response|' + message.id, {payload: {err: 'TIMEOUT'}});
        }, message.timeout);
      }
      internalSend(message);
    });
  } else {
    startingQueue.push({from: from, to: to, content: content, timeout: timeout, cb: cb});
  }
  return this;
};

/**
 * Internal send : find actor & send message
 * @param message {object} formated message to be sent
 */
function internalSend(message) {
  discovery.search(message.to, function (aid) {
    if (new Date().getTime() < (message.date + message.timeout)) {
      message.to = aid;
      var actor = actors.get(aid);
      if (actor.scope === actors.scope.PROCESS) {
        logger.makeLog('trace', 'hub-2', 'sending message inproc...', {message: message});
        adapters.inproc.send(message);
      } else if (actor.scope === actors.scope.LOCAL) {
        logger.makeLog('trace', 'hub-15', 'sending message to another container ipc...', {message: message});
        adapters.remote.send(actor.container, message);
      } else if (actor.scope === actors.scope.REMOTE) {
        logger.makeLog('trace', 'hub-15', 'sending message to another container...', {message: message});
        adapters.remote.send(actor.container, message);
      }
      if (properties['trace stats']) setImmediate(stats.count, message.from, message.to);
    }
  });
}

/**
 * Incomming message processing
 * @param message {object} message (hMessage)
 * @param reply {function}
 */
function onMessage(message, reply) {
  logger.makeLog('trace', 'hub-3', 'processing message', {message: message});
  processMiddlewares(message, messageType.IN, reply, function () {
    var actor = actors.get(message.to, actors.scope.PROCESS);
    if (!actor) {
      logger.makeLog('error', 'hub-22', 'actor ' + message.to + ' not found');
    } else {
      setImmediate(function () {
        try {
          actor.onMessage(message.from, message.payload.content, function (err, content) {
            var response = {from: actor.id, to: message.from, payload: {err: err, content: content}, id: message.id};
            logger.makeLog('trace', 'hub-34', 'sending response...', {response: response});
            processMiddlewares(response, messageType.REPLY_OUT, null, function () {
              reply(response);
            });
          });
        } catch (err) {
          logger.makeLog('warn', 'hub-30', 'message processing error', {message: message, err: err});
        }
      });
    }
  });
}

/**
 * Incomming response processing
 * @param response {object} formated response (message)
 * @param cb {function} original send callback
 */
function onResponse(response, cb) {
  logger.makeLog('trace', 'hub-25', 'processing response', {response: response});
  processMiddlewares(response, messageType.REPLY_IN, null, function () {
    try {
      cb && cb(response.payload.err, response.payload.content);
    } catch (err) {
      logger.makeLog('warn', 'hub-31', 'response processing error', {response: response, err: err});
    }
  });
}

/**
 * Message drop handler
 * @param message {object} message to be processed
 */
function onDrop(message) {
  logger.makeLog('trace', 'hub-26', 'message ' + message.id + ' dropped');
  if (new Date().getTime() < (message.date + message.timeout)) {
    logger.makeLog('trace', 'hub-27', 'resending message ' + message.id);
    internalSend(message);
  } else {
    logger.makeLog('trace', 'hub-28', 'timeout reached, ' + message.id + ' definitely dropped');
  }
}

/**
 * Sends starting queue messages
 */
function processStartingQueue() {
  logger.makeLog('trace', 'hub-19', 'processing starting queue (' + startingQueue.length + ' items)');
  _.forEach(startingQueue, function (message) {
    setImmediate(exports.send, message.from, message.to, message.content, message.cb);
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
 * @param message {object} message to pass through the middlewares
 * @param type {string} message type
 * @param reply {function} reply function
 * @param cb {function} callback
 */
function processMiddlewares(message, type, reply, cb) {
  var index = 0;
  var count = middlewares.length;
  (function next() {
    return (index < count) ? middlewares[index++](message, type, next, reply) : (cb && cb());
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
  if (!utils.aid.isValid(aid) || !utils.aid.isBare(aid)) {
    logger.makeLog('warn', 'hub-1', 'attempt to add an actor using an invalid id !', aid);
    return this;
  }

  aid += '/' + utils.uuid();
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
