/**
 * @module hStructures builder
 */

var utils = {
  uuid: require("./utils/uuid")
};

/**
 * Builds hMessage
 * @param actor {string} hMessage target aid
 * @param type {string} hMessage type
 * @param payload {object} hMessage content
 * @param options {object} optional attributes
 * @returns {object} hMessage
 */
exports.message = function (actor, type, payload, options) {
  options = options || {};
  var message = {};
  message.msgid = utils.uuid();
  message.actor = actor;
  message.sent = (new Date()).getTime();
  if (type) message.type = type;
  if (payload) message.payload = payload;
  if (options.ref) message.ref = options.ref;
  if (options.author) message.author = options.author;
  if (options.headers) message.headers = options.headers;
  if (options.timeout) message.timeout = options.timeout;
  return message;
};

/**
 * Builds hCommand
 * @param actor {string} hMessage target aid
 * @param cmd {string} hCommand type
 * @param params {object} hCommand params
 * @param options {object} optional attributes
 * @returns {object} hMessage
 */
exports.command = function (actor, cmd, params, options) {
  params = params || {};
  options = options || {};
  var command = {cmd: cmd, params: params};
  return exports.message(actor, "hCommand", command, options);
};

/**
 * Builds hResult
 * @param actor {string} hMessage target aid
 * @param ref {string} hResult ref
 * @param status {number} hResult status
 * @param result {*} hResult result
 * @param options {object} optional attributes
 * @returns {object} hMessage
 */
exports.result = function (actor, ref, status, result, options) {
  options = options || {};
  result = {status: status, result: result};
  options.ref = ref;
  return exports.message(actor, "hResult", result, options);
};
