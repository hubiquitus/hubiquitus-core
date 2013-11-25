/**
 * @module actors management
 */

var h = require('./hubiquitus');
var utils = {
  aid: require('./utils/aid')
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
  if (!bareActors[bare]) {
    bareActors[bare] = {process: [], local: [], remote: [], all: []};
  }
  bareActors[bare][actor.scope].push(actor.id);
  bareActors[bare][exports.scope.ALL].push(actor.id);
  h.events.emit('actor added', actor.id);
};

/**
 * Removes actor from cache
 * @param aid {string} actor to remove
 */
exports.remove = function (aid) {
  if (utils.aid.isBare(aid)) {
    delete bareActors[aid];
  } else {
    var actor = actors[aid];
    if (actor) {
      var bare = utils.aid.bare(aid);
      _.remove(bareActors[bare][actor.scope], function (currentAid) {
        return currentAid === aid;
      });
      _.remove(bareActors[bare][exports.scope.ALL], function (currentAid) {
        return currentAid === aid;
      });
      if (_.isEmpty(bareActors[bare][exports.scope.ALL])) {
        h.events.emit('actor removed', bare);
      }
      delete actors[aid];
    }
  }
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
      var matchingAids = [];
      var scopes = [exports.scope.PROCESS, exports.scope.LOCAL, exports.scope.REMOTE];
      var index = -1;
      while (_.isEmpty(matchingAids) && ++index < scopes.length) {
        matchingAids = bareAids[scopes[index]];
      }
      aid = pickOne(matchingAids);
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

/**
 * Pick an element randomly in a collection
 * @param collection {Array}
 */
function pickOne(collection) {
  var item = null;
  if (collection.length !== 0) {
    if (collection.length === 1) {
      item = collection[0];
    } else {
      item = collection[_.random(collection.length - 1)];
    }
  }
  return item;
}

/**
 * Enhance actor with its scope if not already computed
 * @param reqActor {object|string} requested actor or aid
 */
var computeScope = function (actor) {
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
};
