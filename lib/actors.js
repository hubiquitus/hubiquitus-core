/**
 * @module actors management
 */

var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');

var properties = require('./properties');
var cache = require('./cache');
var logger = require('./logger')('hubiquitus:core:actors');

exports.__proto__ = new EventEmitter();
exports.setMaxListeners(0);

/**
 * @type {object}
 */
var actors = {};

/*
 * Listeners
 */
cache.on('cleared', function () {   // update cache with local actors when it's cleared
  _.forEach(actors, function (actor, aid) {
    cache.add(aid, properties.container);
  });
});

/**
 * Add actor
 * @param actor {object} actor to add
 */
exports.add = function (actor) {
  var aid = actor.id;

  if (_.has(actors, aid)) {
    logger.makeLog('warn', 'hub-', 'actor already exists and will be overridden', {old: actors[aid], 'new': actor});
  }

  actors[aid] = actor;
  cache.add(aid, properties.container);

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
    cache.remove(aid, properties.container.ID);
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

/**
 * Return all actors
 * @returns {Object} actors
 */
exports.all = function () {
  return _.keys(actors);
};
