/**
 * @module actors management
 */

var EventEmitter = require('events').EventEmitter;

var properties = require('./properties');
var logger = require('./logger')('hubiquitus:core:actors');
var utils = {
  aid: require('./utils/aid'),
  misc: require('./utils/misc')
};
var _ = require('lodash');

exports.__proto__ = new EventEmitter();
exports.setMaxListeners(0);

/**
 * @type {object}
 */
var actors = {};

/**
 * @type {object}
 */
var bareActors = {};

/**
 * @enum {string}
 */
exports.scope = {
  PROCESS: 'process',
  LOCAL: 'local',
  REMOTE: 'remote',
  ALL: 'all'
};

/**
 * Adds actor in cache
 * @param actor {object} actor to add
 * @param [scope] {string} requested actor scope (forced if provided)
 */
exports.add = function (actor, scope) {
  if (exports.exists(actor)) return;

  actor.scope = scope || computeScope(actor);
  actors[actor.id] = actor;

  var bare = utils.aid.bare(actor.id);
  if (!bareActors[bare]) bareActors[bare] = [];
  bareActors[bare].push(actor.id);

  logger.makeLog('trace', 'hub-32', 'actor ' + actor.id + ' added !', {actor: actor});
  exports.emit('actor added', actor.id, actor.scope);
};

/**
 * Enhance actor with its scope if not already computed
 * @param {object} actor
 * @return {string} scope
 */
function computeScope(actor) {
  var scope = exports.scope.REMOTE;
  if (actor.container.netInfo.pid === properties.netInfo.pid && actor.container.netInfo.ip === properties.netInfo.ip) {
    scope = exports.scope.PROCESS;
  } else if (actor.container.netInfo.ip === properties.netInfo.ip) {
    scope = exports.scope.LOCAL;
  }
  return scope;
}

/**
 * Removes actor from cache
 * @param aid {string} actor to remove
 * @param [scope] {string} requested actor scope
 */
exports.remove = function (aid, scope) {
  scope = scope || exports.scope.ALL;

  var toRemove = [];
  var bares = null;
  if (utils.aid.isBare(aid)) {
    bares = bareActors[aid];
    if (bares) {
      var aids = _.filter(bares, function (item) {
        return item === aid && exports.inScope(item, scope);
      });
      _.forEach(aids, function (item) {
        _.remove(bares, item);
        var actor = actors[item];
        actor && toRemove.push({id: actor.id, scope: actor.scope});
      });
    } else {
      logger.makeLog('trace', 'hub-44', 'cant remove bare actor ' + aid + ': none matching full');
    }
  } else {
    var actor = actors[aid];
    if (actor) {
      var bare = utils.aid.bare(aid);
      bares = bareActors[bare];
      _.remove(bares, function (item) {
        return item === aid && exports.inScope(item, scope);
      });
      toRemove.push({id: actor.id, scope: actor.scope});
    } else {
      logger.makeLog('trace', 'hub-34', 'cant remove actor ' + aid + ' doesnt exist');
    }
  }
  _.forEach(toRemove, function (item) {
    logger.makeLog('trace', 'hub-33', 'actor ' + item.id + ' removed !', {actor: actor});
    delete actors[item.id];
    exports.emit('actor removed', item.id, item.scope);
  });
};

/**
 * Removes all actor related to given container
 * @param cid {string} container aid
 */
exports.removeByContainer = function (cid) {
  var aids = _.filter(_.keys(actors), function (currentAid) {
    return actors[currentAid].container.id === cid;
  });
  _.forEach(aids, function (aid) {
    exports.remove(aid);
  });
  logger.makeLog('trace', 'hub-35', 'actors owned by container ' + cid + ' removed !');
};

/**
 * Clears cache
 */
exports.clear = function () {
  actors = {};
  bareActors = {};
};

/**
 * Returns actors in the given scope
 * @param {string} scope
 * @returns {Array} actors
 */
exports.all = function (scope) {
  scope = scope || exports.scope.ALL;
  return _.filter(_.keys(actors), function (aid) {
    return exports.inScope(aid, scope);
  });
};

/**
 * Returns actor in cache
 * @param aid {string} requested aid
 * @param [scope] {string} requested actor scope
 * @returns {object} actor
 */
exports.get = function (aid, scope) {
  scope = scope || exports.scope.ALL;
  var actor = actors[aid];
  if (!actor || !exports.inScope(actor, scope)) {
    actor = null;
  }
  return actor;
};

/**
 * Checks that the actor exists
 * @param reqActor {object|string} requested actor or aid
 * @param [scope] {string} requested actor scope
 * @returns {boolean} true if actor exists
 */
exports.exists = function (reqActor, scope) {
  var aid = _.isString(reqActor) ? reqActor : reqActor.id;
  return exports.get(aid, scope) !== null;
};

/**
 * Checks if an actor is in given scope
 * @param reqActor {object|string} requested actor or aid
 * @param scope {string} requested actor scope
 * @returns {boolean} true if actor in scope
 */
exports.inScope = function (reqActor, scope) {
  var inScope = false;
  var actor = _.isString(reqActor) ? actors[reqActor] : actors[reqActor.id];
  if (actor) {
    inScope = (scope === exports.scope.ALL) ? true : (actor.scope === scope);
  }
  return inScope;
};

/**
 * Searches an actor in cache
 * Returns aid if existing in cache
 * If requested aid is bare, returns a full aid picked randomly from the list of bare-matching aid in cache
 * @param reqAid {string} requested aid
 * @returns {string} aid or undefined
 */
exports.pick = function (reqAid) {
  var aid = null;
  if (utils.aid.isFull(reqAid)) {
    if (actors[reqAid]) aid = reqAid;
  } else {
    var bareAids = bareActors[reqAid];
    if (bareAids) {
      aid = utils.misc.roundRobin('actors.pick|' + reqAid, bareAids);
    }
  }
  return aid;
};

/**
 * Searches actors in cache matching with given aid (all full aid matching given aid if bare)
 * @param reqAid {string} requested aid
 * @param [scope] {string} requested scope
 * @returns {Array} matching aid collection
 */
exports.pickAll = function (reqAid, scope) {
  scope = scope || exports.scope.ALL;
  var aids = [];
  if (utils.aid.isFull(reqAid) && exports.inScope(reqAid, scope)) {
    aids.push(reqAid);
  } else {
    aids = _.filter(_.keys(actors), function (currentAid) {
      return utils.aid.bare(currentAid) === reqAid && exports.inScope(currentAid, scope);
    });
  }
  return aids;
};
