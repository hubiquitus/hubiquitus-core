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
 * Sends an inproc message
 * @param message {object} message (hMessage)
 */
exports.send = function (message) {
  timers.setImmediate(function () {
    logger.makeLog('trace', 'hub-107', 'message ' + message.id + ' sent inproc');
    exports.onMessage(message, function (response) {
      events.emit('response', response);
    });
  });
};

/**
 * Inproc message handler has to be overridden (by the container)
 * @param message {object} message (hMessage)
 * @param reply {function} callback
 */
exports.onMessage = function (message, reply) {
  events.emit('message', message, reply);
};
