/**
 * @module monitoring api
 */

var EventEmitter = require('events').EventEmitter;

var app = require('./application');
var actors = require('./actors');
var discovery = require('./discovery');

exports.__proto__ = new EventEmitter();
exports.setMaxListeners(0);

/**
 * Listeners setup
 */

actors.on('actor added', function (aid, scope) {
  exports.emit('actor added', aid, scope);
});

actors.on('actor removed', function (aid, scope) {
  exports.emit('actor removed', aid, scope);
});

discovery.on('discovery started', function (aid) {
  exports.emit('discovery started', aid);
});

discovery.on('discovery stopped', function (aid) {
  exports.emit('discovery stopped', aid);
});

discovery.on('discovery', function (aid) {
  exports.emit('discovery', aid);
});

/**
 * Returns actors in the given scope
 * @param {string} [scope]
 * @returns {Array} actors
 */
exports.actors = function (scope) {
  return actors.all(scope);
};

/**
 * Returns current discoveries with the last research date for each of them
 * @returns {Object} discoveries
 */
exports.discoveries = function () {
  return discovery.discoveries();
};

