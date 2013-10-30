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
  PROCESS: "process",
  LOCAL: "local",
  REMOTE: "remote",
  ALL: "all",
  NONE: "none"
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
 * Removes all actors
 */
exports.removeAll = function () {
  actors = {};
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
 * @param scope {string} requested actor scope
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
 * Returns actors count
 * @returns {number} actors count
 */
exports.count = function () {
  return _.keys(actors).length;
};

/**
 * Checks that the actor exists
 * @param aid {string} requested aid
 * @param scope {string} requested actor scope
 * @returns {boolean} true if actor exists
 */
exports.exists = function (aid, scope) {
  return exports.get(aid, scope) !== null;
};

/**
 * Returns either an actor is local or not
 * @param reqActor {object|string} requested actor or aid
 * @returns {string} scope
 */
exports.getScope = function (reqActor) {
  var scope = exports.scope.NONE;
  var actor = _.isString(reqActor) ? actors[reqActor] : actors[reqActor.id];
  if (actor) {
    scope = exports.scope.REMOTE;
    if (actor.container.netInfo.pid === h.netInfo.pid && actor.container.netInfo.ip === h.netInfo.ip) {
      scope = exports.scope.PROCESS;
    } else if (actor.container.netInfo.ip === h.netInfo.ip) {
      scope = exports.scope.LOCAL;
    }
  }
  return scope;
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
    inScope = (scope === exports.scope.ALL) ? true : (exports.getScope(actor) === scope);
  }
  return inScope;
};

/**
 * Searches an actor in cache
 * Returns aid if existing in cache
 * If requested aid is bare, returns a full aid picked randomly from the list of bare-matching aid in cache
 * @param reqAid {string} requested aid
 * @param scope {string} requested scope
 * @returns {object} aid or undefined
 */
exports.pick = function (reqAid, scope) {
  scope = scope || exports.scope.ALL;
  var aid;
  if (utils.aid.isFull(reqAid) && exports.inScope(reqAid, scope)) {
    aid = reqAid;
  } else {
    var matchingActors = _.filter(_.keys(actors), function (currentAid) {
      return utils.aid.bare(currentAid) === reqAid && exports.inScope(currentAid, scope);
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
 * @param scope {string} requested scope
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
