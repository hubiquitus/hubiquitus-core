/**
 * @module actors management
 */

var h = require('./hubiquitus');
var logger = require('./logger')('hubiquitus:core:actors');
var utils = {
  aid: require('./utils/aid'),
  misc: require('./utils/misc')
};
var _ = require('lodash');

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
  ALL: 'all',
  NONE: 'none'
};

/**
 * Adds actor in cache
 * @param actor {object} actor to add
 */
exports.add = function (actor) {
  computeScope(actor);
  actors[actor.id] = actor;

  var bare = utils.aid.bare(actor.id);
  if (!bareActors[bare]) bareActors[bare] = [];
  bareActors[bare].push(actor.id);

  logger.makeLog('trace', 'hub-32', 'actor ' + actor.id + ' added !', {actor: actor});
  h.events.emit('actor added', actor.id);
};

/**
 * Enhance actor with its scope if not already computed
 * @param {object} actor
 */
function computeScope(actor) {
  var scope = exports.scope.NONE;
  if (!actor.scope) {
    scope = exports.scope.REMOTE;
    if (actor.container.netInfo.pid === h.netInfo.pid && actor.container.netInfo.ip === h.netInfo.ip) {
      scope = exports.scope.PROCESS;
    } else if (actor.container.netInfo.ip === h.netInfo.ip) {
      scope = exports.scope.LOCAL;
    }
    actor.scope = scope;
  }
}

/**
 * Removes actor from cache
 * @param aid {string} actor to remove
 * @param [scope] {string} requested actor scope
 */
exports.remove = function (aid, scope) {
  scope = scope || exports.scope.ALL;

  var bares = bareActors[aid];
  if (utils.aid.isBare(aid)) {
    if (bares) {
      var aids = _.filter(bares, function (item) {
        return item === aid && exports.inScope(item, scope);
      });
      _.forEach(aids, function (item) {
        _.remove(bares, item);
        delete actors[item];
      });
    }
  } else {
    var actor = actors[aid];
    if (actor) {
      var bare = utils.aid.bare(aid);
      _.remove(bares, function (item) {
        return item === aid && exports.inScope(item, scope);
      });
      delete actors[aid];
      _.isEmpty(bares) && h.events.emit('actor removed', bare);
    } else {
      logger.makeLog('trace', 'hub-34', 'cant remove actor ' + aid + ' doesnt exist');
    }
  }

  logger.makeLog('trace', 'hub-33', 'actor ' + aid + ' removed !');
  h.events.emit('actor removed', aid);
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
 * @param aid {string} requested aid
 * @param [scope] {string} requested actor scope
 * @returns {boolean} true if actor exists
 */
exports.exists = function (aid, scope) {
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
