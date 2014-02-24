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
    exports.emit('req sent', req);
    exports.emit('req received', req);
    exports.emit('req', req, function (res) {
      if (req.cb) {
        exports.emit('res sent', res);
        exports.emit('res received', res);
        exports.emit('res', res);
      }
    });
  });
};
