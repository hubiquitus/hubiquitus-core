/**
 * @module statistics
 * Container's statistics
 */

var dgram = require('dgram');

var logger = require('./logger')('hubiquitus:core:stats');
var properties = require('./properties');

/**
 * @type {string}
 */
var host;

/**
 * @type {number}
 */
var port;

/**
 * @type {Socket}
 */
const socket = dgram.createSocket('udp4');

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
exports.start = function (options) {
  options = options || {};
  host = options.host || 'localhost';
  port = options.port || 5555;
  loop && clearInterval(loop);
  loop = setInterval(sendStats, 1000);
};

/**
 * Stop statistics
 */
exports.stop = function () {
  loop && clearInterval(loop);
};

/**
 * Add message count
 * @param from {string}
 * @param to {string}
 */
exports.count = function (from, to) {
  counts['global']++;
  var key = from + '->' + to;
  counts[key] === void 0 ? counts[key] = 1 : counts[key]++;
};

/**
 * Sends statistics to listeners
 */
function sendStats() {
  var buffer = new Buffer(JSON.stringify({id: properties.ID, counts: counts}));
  counts = {'global': 0};
  socket.send(buffer, 0, buffer.length, port, host, function (err) {
    err && logger.makeLog('error', 'hub-300', err);
  });
}
