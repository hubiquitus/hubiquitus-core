/**
 * @module actors management
 */

var h = require("./hubiquitus");
var utils = {
  aid: require("./utils/aid")
};
var _ = require("lodash");

/**
 * @type {object}
 */
var actors = {};

/**
 * @type {enum}
 */
exports.scope = {
  PROCESS: 0,
  LOCAL: 1,
  REMOTE: 2,
  ALL: 3
};

/**
 * Adds actor in cache
 * @param actor {object} actor to add
 */
exports.add = function (actor) {
  actors[actor.id] = actor;
};

/**
 * Removes actor from cache
 * @param aid {string} actor to remove
 */
exports.remove = function (aid) {
  delete actors[aid];
};

/**
 * Removes all actor related to given container
 * @param cid {string} container aid
 */
exports.removeByContainer = function (cid) {
  //TODO
};

/**
 * Returns actor in cache
 * @param aid {string} requested aid
 * @param scope {number} requested actor scope
 * @returns {object} actor
 */
exports.get = function (aid, scope) {
  scope = scope || exports.scope.all;
  var actor = actors[aid];
  if (exports.wherIs(actor) !== scope) {
    actor = null;
  }
  return actor;
};

/**
 * Checks that the actor exists
 * @param aid {string} requested aid
 * @param scope {number} requested actor scope
 * @returns {boolean} true if actor exists
 */
exports.exists = function (aid, scope) {
  return exports.get(aid, scope) !== null;
};

/**
 * Returns either an actor is local or not
 * @param actor {object|string} requested actor or aid
 * @returns {number} scope
 */
exports.getScope = function (actor) {
  if (_.isNumber(actor)) actor = exports.get(actor);
  var scope = exports.scope.REMOTE;
  if (actor.container.netInfo.pid === h.netInfo.pid && actor.container.netInfo.ip === h.netInfo.ip) {
    scope = exports.scope.PROCESS;
  } else if (actor.container.netInfo.ip === h.netInfo.ip) {
    scope = exports.scope.LOCAL;
  }
  return scope;
};

/**
 * Searches an actor in cache
 * Returns aid if existing in cache
 * If requested aid is bare, returns a full aid picked randomly from the list of bare-matching aid in cache
 * @param reqAid {string} requested aid
 * @param scope {number} requested scope
 * @returns {object} aid or undefined
 */
exports.pick = function (reqAid, scope) {
  scope = scope || exports.scope.all;
  var aid;
  if (utils.aid.isFull(reqAid) && actors[reqAid] && exports.getScope(actors[reqAid]) === scope) {
    aid = reqAid;
  } else {
    var matchingActors = [];
    _.forEach(_.keys(actors), function (currentAid) {
      if (utils.aid.bare(currentAid) === reqAid && exports.getScope(actors[currentAid]) === scope) {
        matchingActors.push(currentAid);
      }
    });
    if (matchingActors.length !== 0) {
      aid = matchingActors[_.random(matchingActors.length - 1)];
    }
  }
  return aid;
};

/**
 * Searches actors in cache matching with given aid (all full aid matching given aid if bare)
 * @param reqAid {string} requested aid
 * @param scope {number} requested scope
 * @returns {Array} matching aid collection
 */
exports.pickAll = function (reqAid, scope) {
  scope = scope || exports.scope.all;
  var aids = [];
  if (utils.aid.isFull(reqAid) && aids[reqAid] && exports.getScope(aids[reqAid]) === scope) {
    aids.push(reqAid);
  } else {
    _.forEach(_.keys(aids), function (currentAid) {
      if (utils.aid.bare(currentAid) === reqAid && exports.getScope(aids[currentAid]) === scope) {
        aids.push(currentAid);
      }
    });
  }
  return aids;
};
