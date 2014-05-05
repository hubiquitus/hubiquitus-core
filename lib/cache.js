/**
 * @module cache actors management
 */

var EventEmitter = require('events').EventEmitter;

var properties = require('./properties');
var actors = require('./actors');
var logger = require('./logger')('hubiquitus:core:cache');
var utils = {
  uuid: require('./utils/uuid'),
  misc: require('./utils/misc')
};
var _ = require('lodash');

exports.__proto__ = new EventEmitter();
exports.setMaxListeners(0);

/**
 * @type {object}
 */
var cache = {};

/**
 * @type {object}
 */
var containers = {};

/**
 * Add an actor to the cache
 * @param aid {string}
 * @param container {object}
 */
exports.add = function (aid, container) {
  containers[container.id] = container;
  if (_.isArray(cache[aid])) {
    !_.contains(cache[aid], container.id) && cache[aid].push(container.id);
  } else {
    cache[aid] = [container.id];
  }
  logger.makeLog('trace', 'hub-', 'actor ' + aid + ' added in cache for container ' + container.name + ' (' + container.id + ') !', {aid: aid, container: container});
  exports.emit('actor added', aid, container.id);
};

/**
 * Removes an actor from the cache
 * @param aid {string}
 * @param cid {string}
 */
exports.remove = function (aid, cid) {
  if (_.isArray(cache[aid])) {
    var container = containers[cid];
    _.remove(cache[aid], cid);
    logger.makeLog('trace', 'hub-', 'actor ' + aid + ' removed from cache for container' + container.name + ' (' + container.id + ') !', {aid: aid, container: container});
    exports.emit('actor removed', aid, cid);
  }
};

/**
 * Pick a container id having the given aid
 * @param aid {string} searched aid
 * @return cid {string}
 */
exports.pick = function (aid) {
  if (_.isArray(cache[aid])) {
    return utils.misc.roundRobin(aid + '!pick', _.filter(cache[aid], function (item) {
      return (_.isObject(containers[item]) && !containers[item].disabled) ? true : false;
    }));
  }
  return null;
};

/**
 * Get a container for the given cid
 * @param cid {string}
 * @return {object|undefined}
 */
exports.getContainer = function (cid) {
  return containers[cid];
};

/**
 * Remove all actors for the given cid
 * @param cid {string}
 */
exports.removeContainer = function (cid) {
  var container = containers[cid];
  if (container) {
    logger.makeLog('trace', 'hub-', 'container ' + container.name + '(' + container.id + ') removed from cache', {container: container});
    delete containers[cid];
    _.forEach(cache, function (cids) {
      _.remove(cids, cid);
    });
  }
};

/**
 * Temporarly disable a container
 * @param cid {String}
 */
exports.disableContainer = function (cid) {
  var container = containers[cid];
  if (container) {
    container.disabled = true;
  }
  setTimeout(function () {
    delete container.disabled;
  }, properties.containerDisableTime);
};

/**
 * Clear cache
 */
exports.clear = function () {
  logger.makeLog('trace', 'hub-', 'cache cleared', {actorsCleared: cache, containersCleared: containers});
  cache = {};
  containers = {};
  exports.emit('cleared');
};

/**
 * Return all actors
 * @returns {Object} actors
 */
exports.actors = function () {
  return _.keys(cache);
};

/**
 * Return all containers
 * @returns {Object} actors
 */
exports.containers = function () {
  return _.map(containers, function (value) {
    return {id: value.id, name: value.name};
  });
};
