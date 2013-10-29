/**
 * @module actors management
 */

var hubiquitus = require("./hubiquitus");
var utils = {
  aid: require("./utils/aid")
};
var _ = require("lodash");

/**
 * @type {object}
 */
var actors = {};

/**
 * Adds actor in cache
 * @param actor {object} actor to add
 */
exports.add = function (actor) {
  actors[actor.aid] = actor;
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
exports.removeAllByContainer = function (cid) {
  //TODO
};

/**
 * Returns actor in cache
 * @param aid {string} requested aid
 * @returns {object} actor
 */
exports.get = function (aid) {
  return actors[aid];
};

/**
 * Searches an actor in cache
 * Returns aid if existing in cache
 * If requested aid is bare, returns a full aid picked randomly from the list of bare-matching aid in cache
 * @param reqAid {string} requested aid
 * @returns {object} aid or undefined
 */
exports.pick = function (reqAid) {
  var aid;
  if (utils.aid.isFull(reqAid) && actors[reqAid] && actors[reqAid].container.id === hubiquitus.ID) {
    aid = reqAid;
  } else {
    var matchingActors = [];
    _.forEach(_.keys(actors), function (currentAid) {
      if (utils.aid.bare(currentAid) === reqAid && actors[currentAid].container.id === hubiquitus.ID) {
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
 * @returns {Array} matching aid collection
 */
exports.pickAll = function (reqAid) {
  var aids = [];
  if (utils.aid.isFull(reqAid) && aids[reqAid] && aids[reqAid].container.id === hubiquitus.ID) {
    aids.push(reqAid);
  } else {
    _.forEach(_.keys(aids), function (currentAid) {
      if (utils.aid.bare(currentAid) === reqAid && aids[currentAid].container.id === hubiquitus.ID) {
        aids.push(currentAid);
      }
    });
  }
  return aids;
};
