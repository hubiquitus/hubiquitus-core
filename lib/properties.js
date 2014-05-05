/**
 * Container properties
 */

var utils = {
  ip: require('./utils/ip'),
  uuid: require('./utils/uuid')
};

exports.ID = utils.uuid();

exports.container = {};
exports.container.id = exports.ID;
exports.container.name = exports.container.id;
exports.container.ip = utils.ip.resolve();
exports.container.pid = process.pid;
exports.container.port = null;

exports.sendDefaultTimeout = 30000;
exports.sendMaxTimeout = 5 * 60000;
exports.sendRetryDelay = 10;

exports.discoveryRemind = 45000;
exports.discoveryTimeout = 60000;
exports.discoveryMinInterval = 18000;
exports.discoveryMaxInterval = 22000;

exports.containerPingTimeout = 5000;

exports.containerDisableTime = 1000;
exports.defaultMaxLag = 500;
