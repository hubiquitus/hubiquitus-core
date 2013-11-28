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
