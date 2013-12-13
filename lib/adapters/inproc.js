/**
 * @module inproc adapter
 */

var timers = require('timers');
var EventEmitter = require('events').EventEmitter;
var logger = require('../logger')('hubiquitus:core:adapter:inproc');

exports.__proto__ = new EventEmitter();
exports.setMaxListeners(0);

/**
 * Sends an inproc request
 * @param req {object} request
 */
exports.send = function (req) {
  timers.setImmediate(function () {
    logger.makeLog('trace', 'hub-107', 'request ' + req.id + ' sent inproc');
    exports.emit('req', req, function (res) {
      req.cb && exports.emit('res', res);
    });
  });
};
