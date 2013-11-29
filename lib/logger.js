/**
 * @module logger
 * Basic logging features
 */

var h = require('./hubiquitus');
var util = require('util');
var _ = require('lodash');
var uuid = require('./utils/uuid');

const levels = {trace: 0, debug: 1, info: 2, warn: 3, err: 4, error: 4};
var loggers = {};

/**
 * Provides a level for the specified namespace
 * @param namespace
 * @returns {Logger}
 */
module.exports = function (namespace) {
  var logger = loggers[namespace];
  if (!logger) {
    logger = new Logger(namespace);
    loggers[namespace] = logger;
  }
  return logger;
};

/**
 * Enable a logger
 * @param namespace {string} namespace of the logger to enable
 */
exports.enable = function (namespace) {
  var logger = loggers[namespace];
  if (logger) logger.enabled = true;
};

/**
 * Disable a logger
 * @param namespace {string} namespace of the logger to disable
 */
exports.disable = function (namespace) {
  var logger = loggers[namespace];
  if (logger) logger.enabled = false;
};

/**
 * Set a logger level
 * @param namespace {string} namespace of the logger whose level has to be set
 * @param level {string} level
 */
exports.level = function (namespace, level) {
  var logger = loggers[namespace];
  if (logger) logger.level = level;
};

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
_.forEach(levels, function (level) {
  Logger.prototype[level] = function () {
    return log(this, level, Array.prototype.slice.call(arguments));
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
  var errors = [];
  if (!_.isObject(techData)) {
    techData = techData ? {data: techData} : {};
  }
  _.forOwn(techData, function (item) {
    if (util.isError(item)) errors.push(item);
  });
  techData.ID = h.ID;
  messages.push({techData: techData});
  if (userData) messages.push({userData: userData});
  var errid = log(this, level, messages.concat(errors));
  return {errid: errid, code: code, data: userData};
};

/**
 * Logs given messages into stdout
 * @param logger {Logger} logger
 * @param level {string} log level
 * @param messages {array} messages to log
 * @returns {string} error unique id
 */
var log = function (logger, level, messages) {
  var errid = uuid();
  if (logger.enabled && levels[level] >= levels[logger.level]) {
    var log = '[' + logger.namespace + '][' + level + '][' + new Date() + ']';
    _.forEach(messages, function (message) {
      log += '\n';
      if (util.isError(message)) {
        log += 'Error ' + message.message + ' - Stack ' + message.stack;
      } else if (_.isObject(message) || _.isArray(message)) {
        log += util.inspect(message, {depth: 10});
      } else {
        log += message;
      }
    });
    console.log(log + '\n');
  }
  return errid;
};
