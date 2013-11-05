/**
 * @module hubiquitus
 * Container's statistics
 */

var _ = require("lodash");
var logger = require("./logger");

/**
 * @type {number}
 */
var loop;

/**
 * @type {object}
 */
var counts = {
    'global': 0
};

/**
 * Starts statistics
 */
exports.start = function () {
  loop = setInterval(sendStats, 1000);
};

/**
 * Stop statistics
 */
exports.stop = function () {
  clearInterval(loop);
};

/**
 * Add message count
 * @param from {string}
 * @param to {from}
 */
exports.count = function (from, to) {
  counts['global']++;
  var key = from + '->' + to;
  _.isUndefined(counts[key]) ? counts[key] = 1 : counts[key]++;
};

/**
 * Sends statistics to listeners
 */
function sendStats() {
  logger.makeLog("trace", "hub-300", "stats count", counts);
  // TODO send stats over ws ? tcp ?
  counts = {
    'global': 0
  }
}
