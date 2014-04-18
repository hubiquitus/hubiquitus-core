/**
 * @module monitoring api
 */

var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');

var application = require('./application');
var properties = require('./properties');
var logger = require('./logger')('hubiquitus:core:monitoring');
var actors = require('./actors');
var cache = require('./cache');
var discovery = require('./discovery');
var adapters = {
  inproc: require('./adapters/inproc'),
  remote: require('./adapters/remote')
};

exports.__proto__ = new EventEmitter();
exports.setMaxListeners(0);

/*
 * Listeners setup
 */

actors.on('actor added', function (aid) {
  exports.emit('actor added', aid);
});

actors.on('actor removed', function (aid) {
  exports.emit('actor removed', aid);
});

cache.on('actor added', function (aid, cid) {
  exports.emit('cache actor added', aid, cid);
});

cache.on('actor removed', function (aid, cid) {
  exports.emit('cache actor removed', aid, cid);
});

discovery.on('discovery started', function (aid) {
  exports.emit('discovery started', aid);
});

discovery.on('discovery stopped', function (aid) {
  exports.emit('discovery stopped', aid);
});

discovery.on('discovery', function (aid) {
  exports.emit('discovery', aid);
});

_.forEach(adapters, function (adapter) {
  adapter.on('req sent', function (req) {
    exports.emit('req sent', req);
  });

  adapter.on('req received', function (req) {
    exports.emit('req received', req);
  });

  adapter.on('res sent', function (res) {
    exports.emit('res sent', res);
  });

  adapter.on('res received', function (res) {
    exports.emit('res received', res);
  });
});

/**
 * Returns actors
 * @returns {Array} actors
 */
exports.actors = function () {
  return actors.all();
};

/**
 * Returns cache
 * @return {Object} cache
 */
exports.cache = {
  actors: cache.actors,
  containers: cache.containers
};

/**
 * Returns current discoveries with the last research date for each of them
 * @returns {Object} discoveries
 */
exports.discoveries = function () {
  return discovery.discoveries();
};

/*
 * Ping management
 */

application.addActor(properties.container.ID + '_ping', function (req) {
  logger.makeLog('trace', 'hub-51', 'ping', {req: req});
  req.reply();
});

/**
 * Ping a container
 * @param cid {String} target container id
 * @param cb {Function} callback
 */
exports.pingContainer = function (cid, cb) {
  application.send(properties.container.ID, cid + '_ping', 'PING', properties.containerPingTimeout, function (err) {
    cb(err);
  });
};
