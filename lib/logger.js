/**
 * @module logger
 * Basic logging features
 */

var util = require("util");
var _ = require("lodash");
var uuid = require("./utils/uuid");

/**
 * Logs given messages into stdout
 * @param level {string} log level
 * @param messages {array} messages to log
 * @returns {string} error unique id
 */
var log = function (level, messages) {
  var errid = uuid();
  var log = "[" + level + "]";
  log += "[" + new Date() + "]";
  _.forEach(messages, function (message) {
    log += "\n\t";
    if (message.constructor === Error) {
      log += "Error " + message.message + " - Stack " + message.stack;
    } else if (_.isObject(message) || _.isArray(message)) {
      log += util.inspect(message, {colors: true, depth: 10});
    } else {
      log += message;
    }
  });
  console.log(log);
  return errid;
};

/**
 * Calls log with trace level
 * @returns {string} error unique id
 */
exports.trace = function () {
  return log("trace", Array.prototype.slice.call(arguments));
};

/**
 * Calls log with debug level
 * @returns {string} error unique id
 */
exports.debug = function () {
  return log("debug", Array.prototype.slice.call(arguments));
};

/**
 * Calls log with info level
 * @returns {string} error unique id
 */
exports.info = function () {
  return log("info", Array.prototype.slice.call(arguments));
};

/**
 * Calls log with warn level
 * @returns {string} error unique id
 */
exports.warn = function () {
  return log("warn", Array.prototype.slice.call(arguments));
};

/**
 * Calls log with err level
 * @returns {string} error unique id
 */
exports.err = function () {
  return log("err", Array.prototype.slice.call(arguments));
};

/**
 * Calls log with err level
 * @alias err
 * @returns {string} error unique id
 */
exports.error = function () {
  return log("err", Array.prototype.slice.call(arguments));
};

/**
 * Builds log with given params
 * @param level {string} log level
 * @param code {string} unique error code
 * @param aid {string} actor id
 * @param techData {object} optional technical data
 * @param userData {object} optional use data
 */
exports.makeLog = function (level, code, aid, techData, userData) {
  var messages = [{code: code}, {aid: aid}];
  var errors = [];
  if (_.isObject(techData)) {
    _.forOwn(techData, function (item) {
      if (item.constructor === Error) errors.push(item);
    });
  }
  if (techData) messages.push({techData: techData});
  if (userData) messages.push({userData: userData});
  var errid = log(level, messages.concat(errors));
  return {errid: errid, code: code, data: userData};
};
