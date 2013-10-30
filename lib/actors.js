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
exports.location = {
  INPROC: 0,
  IPC: 1,
  TCP: 2,
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
 * @param location {number} requested actor location
 * @returns {object} actor
 */
exports.get = function (aid, location) {
  location = location || exports.location.all;
  var actor = actors[aid];
  if (exports.wherIs(actor) !== location) {
    actor = null;
  }
  return actor;
};

/**
 * Returns either an actor is local or not
 * @param actor {object|string} requested actor or aid
 * @returns {number} location
 */
exports.whereIs = function (actor) {
  if (_.isNumber(actor)) actor = exports.get(actor);
  var location = exports.location.TCP;
  if (actor.container.id === h.ID && actor.container.netInfo.pid === h.netInfo.pid) {
    location = exports.location.INPROC;
  } else if (actor.container.netInfo.ip === h.netInfo.ip) {
    location = exports.location.IPC;
  }
  return location;
};

/**
 * Searches an actor in cache
 * Returns aid if existing in cache
 * If requested aid is bare, returns a full aid picked randomly from the list of bare-matching aid in cache
 * @param reqAid {string} requested aid
 * @param location {number} requested location
 * @returns {object} aid or undefined
 */
exports.pick = function (reqAid, location) {
  var aid;
  if (utils.aid.isFull(reqAid) && actors[reqAid] && exports.whereIs(actors[reqAid]) === location) {
    aid = reqAid;
  } else {
    var matchingActors = [];
    _.forEach(_.keys(actors), function (currentAid) {
      if (utils.aid.bare(currentAid) === reqAid && exports.whereIs(actors[currentAid]) === location) {
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
 * @param location {number} requested location
 * @returns {Array} matching aid collection
 */
exports.pickAll = function (reqAid, location) {
  var aids = [];
  if (utils.aid.isFull(reqAid) && aids[reqAid] && exports.whereIs(aids[reqAid]) === location) {
    aids.push(reqAid);
  } else {
    _.forEach(_.keys(aids), function (currentAid) {
      if (utils.aid.bare(currentAid) === reqAid && exports.whereIs(aids[currentAid]) === location) {
        aids.push(currentAid);
      }
    });
  }
  return aids;
};
