/**
 * @module misc utils
 */

var _ = require('lodash');

/**
 * Pick an element randomly in a collection
 * @param collection {Array}
 */
exports.pickOne = function (collection) {
  var item = null;
  var len = collection.length;
  if (len !== 0) {
    if (len === 1) {
      item = collection[0];
    } else {
      item = collection[_.random(len - 1)];
    }
  }
  return item;
};

/**
 * Round robin current indexes by namespace
 * @type {Object}
 */
var roundRobinIndexes = {};

/**
 * Round robin
 * @param {string} namespace
 * @param {Array} collection
 */
exports.roundRobin = function (namespace, collection) {
  var len = collection.length;
  if (len === 0) return null;
  if (len === 1) return collection[0];
  var idx = roundRobinIndexes[namespace];
  if (idx === undefined) idx = -1;
  var nextIdx = (++idx)%len;
  roundRobinIndexes[namespace] = nextIdx;
  return collection[nextIdx];
};
