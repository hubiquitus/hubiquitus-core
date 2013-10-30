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
 * @type {object}
 */
var bareActors = {process: [], local: [], remote: []};

/**
 * @enum {string}
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
  bareActors[exports.getScope(actor.id)].push(actor.id);
};

/**
 * Removes actor from cache
 * @param aid {string} actor to remove
 */
exports.remove = function (aid) {
  _.remove(bareActors[exports.getScope(aid)], function (currentAid) {
    return currentAid === aid;
  });
  delete actors[aid];
};

/**
 * Removes all actors
 */
exports.removeAll = function () {
  bareActors = {process: [], local: [], remote: []};
  actors = {};
};

/**
 * Removes all actor related to given container
 * @param cid {string} container aid
 */
exports.removeByContainer = function (cid) {
  var aids = _.find(_.keys(actors), function (currentAid) {
    return actors[currentAid].container.id === cid;
  });
  _.forEach(aids, function (aid) {
    exports.remove(aid);
  });
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
  var aid = _.isString(reqActor) ? actors[reqActor] : actors[reqActor.id];
  if (aid) {
    inScope = (scope === exports.scope.ALL) ? true : (exports.getScope(aid) === scope);
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
  var aid = null;
  if (utils.aid.isFull(reqAid) && exports.inScope(reqAid, scope)) {
    aid = reqAid;
  } else {
    // requested aid is bare : we pick a full bare-matching aid
    var matchingAids = [];
    if (scope !== exports.scope.ALL) {
      matchingAids = _.filter(bareActors[scope], function (currentAid) {
        return utils.aid.bare(currentAid) === reqAid;
      });
    } else {
      // scopes priority : process->local->remote
      var scopes = [exports.scope.PROCESS, exports.scope.LOCAL, exports.scope.REMOTE];
      var i = -1;
      while (matchingAids.length === 0 && ++i < scopes.length) {
        var currentScope = scopes[i];
        matchingAids = _.filter(bareActors[currentScope], function (currentAid) {
          return utils.aid.bare(currentAid) === reqAid;
        });
      }
    }
    aid = pickOne(matchingAids);
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
