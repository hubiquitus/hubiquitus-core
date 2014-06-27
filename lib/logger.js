/**
 * @module logger
 * Basic logging features
 */

var util = require('util');
var _ = require('lodash');
var prettiyfy = require('prettify-error');

var properties = require('./properties');
var uuid = require('./utils/uuid');

const levels = {trace: 0, debug: 1, info: 2, warn: 3, err: 4, error: 4};
var loggers = {};
var enabled = {};

/**
 * Provides a level for the specified namespace
 * @param namespace
 * @returns {Logger}
 */
var manager = module.exports = function (namespace) {
  var logger = loggers[namespace];
  if (!logger) {
    logger = new Logger(namespace);
    loggers[namespace] = logger;
    _.forEach(_.keys(enabled), function (item) {
      if ((new RegExp(item)).test(namespace)) {
        logger.enabled = true;
        logger.level = enabled[item] || 'info';
      }
    });
  }
  return logger;
};
manager.getLogger = manager;

/**
 * Enable a logger
 * @param namespace {string} namespace of the logger to enable
 * @param [level] {string} level
 */
manager.enable = function (namespace, level) {
  var regex = namespace2regex(namespace);
  enabled[regex] = level;
  var namespaces = matchingNamespaces(regex);
  _.forEach(namespaces, function (item) {
    var logger = loggers[item];
    if (logger) {
      logger.enabled = true;
      if (level) logger.level = level;
    }
  });
};

/**
 * Disable a logger
 * @param namespace {string} namespace of the logger to disable
 */
manager.disable = function (namespace) {
  var regex = namespace2regex(namespace);
  delete enabled[regex];
  var namespaces = matchingNamespaces(regex);
  _.forEach(namespaces, function (item) {
    var logger = loggers[item];
    if (logger) logger.enabled = false;
  });
};

/**
 * Set a logger level
 * @param namespace {string} namespace of the logger whose level has to be set
 * @param level {string} level
 */
manager.level = function (namespace, level) {
  var regex = namespace2regex(namespace);
  var namespaces = matchingNamespaces(regex);
  _.forEach(namespaces, function (item) {
    var logger = loggers[item];
    if (logger) logger.level = level;
  });
};

/**
 * Generate a regex from a namespace
 * @param {string} namespace
 * @returns {string}
 */
function namespace2regex(namespace) {
  return '^' + namespace.replace('*', '.*?') + '$';
}

/**
 * Find matching namespaces
 * @param {string} regex
 * @returns {Array}
 */
function matchingNamespaces(regex) {
  var re = new RegExp(regex);
  return _.filter(_.keys(loggers), function (key) {
    return re.test(key);
  });
}

/**
 * Logger
 * @param namespace {string} logger namespace
 * @constructor
 */
function Logger(namespace) {
  this.namespace = namespace;
  this.enabled = false;
  this.level = 'info';
}

/**
 * Calls log with given level
 * @returns {string} error unique id
 */
_.forEach(_.keys(levels), function (level) {
  Logger.prototype[level] = function () {
    return internalLog(this, level, Array.prototype.slice.call(arguments));
  };
});

/**
 * Builds log with given params
 * @param level {string} log level
 * @param code {string} unique error code
 * @param message {string} message
 * @param [techData] {object} technical data
 * @param [userData] {object} use data
 */
Logger.prototype.makeLog = function (level, code, message, techData, userData) {
  if (levels[level] < levels[this.level]) return {};

  var messages = [];
  messages.push('[' + code + '] ' + message);
  if (techData) messages.push({techData: techData});
  if (userData) messages.push({userData: userData});

  var errid = internalLog(this, level, messages);
  return {errid: errid, code: code, data: userData};
};

/**
 * Logs given messages into stdout
 * @param logger {Logger} logger
 * @param level {string} log level
 * @param messages {Array} messages to log
 * @returns {string} error unique id
 */
var internalLog = function (logger, level, messages) {
  var errors = [];
  if (level === 'error' || level === 'err' || level === 'warn') {
    errors.push(formatError(new Error('Current Stack')));
  }
  _.forEach(messages, function (message) {
    if (util.isError(message)) {
      errors.push(formatError(message));
    } else if (_.isObject(message) || _.isArray(message)) {
      var extractedErrors = extractErrors(message, 3);
      if (!_.isEmpty(extractedErrors)) {
        errors = errors.concat(extractedErrors);
      }
    }
  });

  var errid = uuid();
  if (logger.enabled && levels[level] >= levels[logger.level]) {
    try {
      manager.log(logger.namespace, level, messages, errors, properties.container);
    } catch (err) {
      console.error('hubiquitus log processing error', err, err.stack);
    }
  }
  return errid;
};

/**
 * Effective logger; can be overriden
 * @param namespace {string} namespace
 * @param level {string} log level
 * @param messages {array} messages to log
 * @param errors {array} Array of nodejs Error()
 * @param container {object} Container informations
 */
manager.log = function (namespace, level, messages, errors, container) {
  var log = '[' + namespace + '][' + level + '][' + new Date() + ']';

  log += '\n';
  log += '    Container ' + container.name + ' running on ' +  container.ip + ':' + container.port + ' with pid ' + container.pid + '\n';
  if (container.name !== container.ie) log += '    Container id : ' + container.id

  log += '\n';
  log += '    Messages : ';
  _.forEach(messages, function (message) {
    log += '\n';
    if (_.isObject(message) || _.isArray(message)) {
      var msg = '        ' + util.inspect(message, {depth: 10});
      msg = msg.replace(/\n/g, '\n        ');
      log += msg;
    } else {
      log += '        ' + message;
    }
  });

  log += '\n';
  if (!_.isEmpty(errors)) {
    log += '    Errors : ';
    _.forEach(errors, function (error) {
      log += '\n';
      var stack = (error.stack) ? error.stack.toString() : '';
      stack = stack.replace(/\n/g, '\n        ');
      log += '        ' + stack;
    });
  }
  console.log(log + '\n');
};

/**
 * Formats an error
 * @param {Error} err
 * @return {Object} formatted error
 */
function formatError(err) {
  return {err: err.message, stack: err.stack};
}

/**
 * Extract errors from array|object
 * @param {Object|Array} data
 * @param {Number} depth
 * @return {Array} errors
 */
function extractErrors(data, depth) {
  depth = depth || 1;
  var currentDepth = 0;

  return (function extract(data) {
    currentDepth++;
    var errors = [];
    _.forEach(data, function (item, name) {
      if (util.isError(item)) {
        errors.push(formatError(item));
      } else if (currentDepth < depth && (_.isObject(data) || _.isArray(data))) {
        var extractedErrors = extract(item);
        if (!_.isEmpty(extractedErrors)) {
          errors = errors.concat(extractedErrors);
        }
      }
    });
    return errors;
  })(data);
}
