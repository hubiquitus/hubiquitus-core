/**
 * Container properties
 */

var utils = {
  ip: require('./utils/ip'),
  uuid: require('./utils/uuid')
};

exports.ID = utils.uuid();

exports.name = exports.ID;

exports.netInfo = {
  ip: utils.ip.resolve(),
  pid: process.pid,
  port: null
};

exports.sendDefaultTimeout = 30000;
exports.sendMaxTimeout = 5 * 60000;
exports.sendRetryDelay = 10;

exports.discoveryRemind = 45000;
exports.discoveryTimeout = 60000;
exports.discoveryMinInterval = 18000;
exports.discoveryMaxInterval = 22000;

exports.containerPingTimeout = 5000;
