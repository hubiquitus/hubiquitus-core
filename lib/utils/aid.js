/**
 * @module actor id (ie: aid)
 * Provides aid management
 */

var _ = require("lodash");
var logger = require("../logger");

/**
 * Checks that it's a valid aid
 * @param aid {string} aid
 * @returns {boolean} true if valid
 */
exports.isValid = function (aid) {
  return _.isString(aid);
};

/**
 * Checks that it's a bare aid
 * @param aid {string} aid
 * @returns {boolean} true if bare aid
 */
exports.isBare = function (aid) {
  var components = exports.components(aid);
  return _.isEmpty(components.session);
};

/**
 * Checks that it's a full aid (ie: aid/session)
 * @param aid {string} aid
 * @returns {boolean} true if full aid
 */
exports.isFull = function (aid) {
  return !exports.isBare(aid);
};

/**
 * Returns bare aid
 * @param aid {string} aid
 * @returns {string} bare aid
 */
exports.bare = function (aid) {
  var components = exports.components(aid);
  return components.bare;
};

/**
 * Returns aid session
 * @param aid {string} aid
 * @returns {string} aid session
 */
exports.session = function (aid) {
  return exports.components(aid).session;
};

/**
 * Returns aid components
 * @param aid {string} aid
 * @returns {object} aid components (ie {domain, user, session})
 */
exports.components = function (aid) {
  var bare = "";
  var session = "";
  if (!exports.isValid(aid)) {
    logger.makeLog("warn", "hub-200", "invalid aid : " + aid);
  } else {
    var splitted = aid.split("/");
    bare = splitted[0] || "";
    session = splitted[1] || "";
  }
  return {bare: bare, session: session};
};
