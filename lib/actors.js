/**
 * @module actors management
 */

var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');

var properties = require('./properties');
var logger = require('./logger')('hubiquitus:core:actors');

exports.__proto__ = new EventEmitter();
exports.setMaxListeners(0);

/**
 * @type {object}
 */
var actors = {};

/**
 * Add actor
 * @param aid {string} id of actor to add
 * @param onMessage {object} actor to add
 */
exports.add = function (aid, onMessage) {
  var actor = {
    id: aid,
    local: true,
    onMessage: onMessage
  };

  if (_.has(actors, aid)) {
    logger.makeLog('warn', 'hub-', 'actor already exists and will be overridden', {old: actors[aid], 'new': actor});
  }

  actors[aid] = actor;
  logger.makeLog('trace', 'hub-', 'actor ' + actor.id + ' added !', {actor: actor});
  exports.emit('actor added', aid);
};

/**
 * Remove actor
 * @param aid {string} id of actor to remove
 */
exports.remove = function (aid) {
  if (_.has(actors, aid)) {
    var actor = actors[aid];
    logger.makeLog('trace', 'hub-', 'actor ' + actor.id + ' removed !', {actor: actor});
    delete actors[aid];
    exports.emit('actor removed', aid);
  }
};

/**
 * Retrieve an actor
 * @param aid {string} id of actor to retreive
 */
exports.get = function (aid) {
  return actors[aid];
};

/**
 * Checks if an exists or not
 * @param aid {string} id of actor
 */
exports.exists = function (aid) {
  return !!actors[aid];
};
