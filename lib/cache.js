/**
 * @module cache actors management
 */

var EventEmitter = require('events').EventEmitter;

var properties = require('./properties');
var actors = require('./actors');
var logger = require('./logger')('hubiquitus:core:cache');
var utils = {
  uuid: require('./utils/uuid'),
  misc: require('./utils/misc')
};
var _ = require('lodash');

exports.__proto__ = new EventEmitter();
exports.setMaxListeners(0);

/**
 * @type {object}
 */
var cache = {};

/**
 * @type {object}
 */
var containers = {};

exports.add = function (aid, container) {

};

exports.remove = function (aid, container) {

};

exports.pick = function () {

};

exports.removeContainer = function (cid) {

};
