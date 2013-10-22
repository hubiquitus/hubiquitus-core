/**
 * @module urn
 * Provides urn management
 */

var _ = require("lodash");

/**
 * Checks that it's a valid urn
 * @param urn {string} urn
 * @returns {boolean} true if valid
 */
exports.isValid = function (urn) {
  return /(^urn:[a-zA-Z0-9]{1}[a-zA-Z0-9\-.]+:[a-zA-Z0-9_,=@;!'%/#\(\)\+\-\.\$\*\?]+\/?.+$)/.test(urn);
};

/**
 * Checks that it's a bare urn (ie: urn:domain:user)
 * @param urn {string} urn
 * @returns {boolean} true if bare urn
 */
exports.isBare = function (urn) {
  var components = exports.components(urn);
  return _.isEmpty(components.session);
};

/**
 * Checks that it's a full urn (ie: urn:domain:user/session)
 * @param urn {string} urn
 * @returns {boolean} true if full urn
 */
exports.isFull = function (urn) {
  return !exports.isBare(urn);
};

/**
 * Returns bare urn
 * @param urn {string} urn
 * @returns {string} bare urn (ie: urn:domain:user)
 */
exports.bare = function (urn) {
  var components = exports.components(urn);
  return "urn:" + components.domain + ":" + components.user;
};

/**
 * Returns urn domain
 * @param urn {string} urn
 * @returns {string} urn domain
 */
exports.domain = function (urn) {
  return exports.components(urn)["domain"];
};

/**
 * Returns urn user
 * @param urn {string} urn
 * @returns {string} urn user
 */
exports.user = function (urn) {
  return exports.components(urn)["user"];
};

/**
 * Returns urn session
 * @param urn {string} urn
 * @returns {string} urn session
 */
exports.session = function (urn) {
  return exports.components(urn)["session"];
};

/**
 * Returns urn components
 * @param urn {string} urn
 * @returns {object} urn components (ie {domain, user, session})
 */
exports.components = function (urn) {
  var splitted = urn.split(/:|\//);
  return {
    domain: splitted[1] || "",
    user: splitted[2] || "",
    session: splitted[3] || ""
  };
};
