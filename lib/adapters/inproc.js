/**
 * @module inproc adapter
 */

var timers = require('timers');
var EventEmitter = require('events').EventEmitter;
var logger = require('../logger')('hubiquitus:core:adapter:inproc');

/**
 * @type {EventEmitter}
 */
const events = exports.events = new EventEmitter();
events.setMaxListeners(0);

/**
 * Sends an inproc request
 * @param req {object} request
 */
exports.send = function (req) {
  timers.setImmediate(function () {
    logger.makeLog('trace', 'hub-107', 'request ' + req.id + ' sent inproc');
    events.emit('req', req, function (res) {
      events.emit('res', res);
    });
  });
};
