/**
 * @module inproc adapter
 */

var timers = require('timers');
var EventEmitter = require('events').EventEmitter;
var logger = require('../logger')('hubiquitus:core:adapter:inproc');
var _ = require('lodash');

exports.__proto__ = new EventEmitter();
exports.setMaxListeners(0);

/**
 * Sends an inproc request
 * @param req {object} request
 */
exports.send = function (req) {
  // make message immutable
  var clonedreq = _.cloneDeep(req); 
  timers.setImmediate(function () {
    logger.makeLog('trace', 'hub-107', 'request ' + clonedreq.id + ' sent inproc');
    exports.emit('req sent', clonedreq);
    exports.emit('req received', clonedreq);
    exports.emit('req', clonedreq, function (res) {
      if (clonedreq.cb) {
        exports.emit('res sent', res);
        exports.emit('res received', res);
        exports.emit('res', res);
      }
    });
  });
};
