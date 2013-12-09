/**
 * @module discovery
 */

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var url = require('url');
var dgram = require('dgram');

var h = require('./hubiquitus');
var actors = require('./actors');
var logger = require('./logger')('hubiquitus:core:discovery');
var utils = {
  aid: require('./utils/aid')
};

/**
 * @type {Socket}
 */
var multicastSocket = null;

/**
 * @type {Socket}
 */
var localSocket = null;

/**
 * @type {EventEmitter}
 */
var events = new EventEmitter();
events.setMaxListeners(0);

/**
 * @type {number}
 */
var discoveryTimeout = 30000;

/**
 * @type {number}
 */
var maxDiscoveriesPerAid = 30;

/**
 * @type {object}
 */
var discoveryCountsPerAid = {};

/**
 * Local socket infos
 * @type {object}
 */
var localInfos = null;

/**
 * Multicast/Broadcast discovery socket infos
 * @type {object}
 */
var multicastInfos = null;

/**
 * Remote containers discovery addrs
 * @type {Array} Array of string with format udp://192.168.0.1:5555
 */
var discoveryAddrs = null;

/**
 * Starts containers discovery
 * @param multicastAddr {string} sample 'udp://224.0.0.1:5555'
 * @param localPort {number} used to receive discovery request or results
 * @param [done] {function} done callback
 */
exports.start = function (multicastAddr, localPort, done) {
  if (!localPort) localPort = _.random(3000, 6000);
  localInfos = {host: h.netInfo.ip, port: localPort};
  localSocket = dgram.createSocket('udp4');
  localSocket.bind(localInfos.port, localInfos.host);
  localSocket.on('message', onDiscoveryMessage);

  if (_.isString(multicastAddr)) {
    var discoveryAddrComp = url.parse(multicastAddr);
    var discoveryHost = discoveryAddrComp.hostname;
    var discoveryPort = discoveryAddrComp.port || 5555;
    multicastInfos = {host: discoveryHost, port: discoveryPort};

    multicastSocket = dgram.createSocket('udp4');
    multicastSocket.bind(multicastInfos.port, multicastInfos.host);
    multicastSocket.on('message', onDiscoveryMessage);
  }

  logger.makeLog('trace', 'hub-22', 'discovery started !');
  done && done();
};

/**
 * Stops containers discovery
 */
exports.stop = function () {
  if (localSocket) {
    localSocket.removeAllListeners('message');
    localSocket.close();
    localSocket = null;
  }

  if (multicastSocket) {
    multicastSocket.removeAllListeners('message');
    multicastSocket.close();
    multicastSocket = null;
  }

  logger.makeLog('trace', 'hub-35', 'discovery stopped !');
};

/**
 * Set discovery addresses
 * @param value
 */
exports.setDiscoveryAddrs = function (value) {
  if (_.isArray(value)) {
    discoveryAddrs = [];
    _.forEach(value, function (addr) {
      var addrComp = url.parse(addr);
      var host = addrComp.hostname;
      var port = addrComp.port || 5555;
      var infos = {host: host, port: port};
      discoveryAddrs.push(infos);
    });
  } else {
    discoveryAddrs = null;
  }
};

/**
 * Search for aid
 * @params {string} aid
 */
exports.search = function (aid, callback) {
  logger.makeLog('trace', 'hub-10', 'searching actor ' + aid + '...');
  events.once(aid + '!found', callback);
  discoveryCountsPerAid[aid] = 0;
  if (events.listeners(aid + '!found').length === 1) {
    internalSearch(aid);
  } else {
    logger.makeLog('trace', 'hub-20', 'discovery on ' + aid + ' already in progress...');
  }
};

/**
 * Launch discovery with timeout management
 * @param {string} aid
 */
function internalSearch(aid) {
  discoveryCountsPerAid[aid]++;
  if (discoveryCountsPerAid[aid] === maxDiscoveriesPerAid) {
    events.removeAllListeners(aid + '!found');
    return;
  }

  var localAid = actors.pick(aid);
  if (localAid) {
    logger.makeLog('trace', 'hub-11', 'actor ' + aid + ' found in cache !');
    events.emit(aid + '!found', localAid);
    events.emit(utils.aid.bare(aid) + '!found', localAid);
  } else if (localSocket) {
    logger.makeLog('trace', 'hub-12', 'actor ' + aid + ' not found, sending search request...');
    var discoveryMsg = encodeDiscoveryMessage({type: 'search', from: h.ID, aid: aid, netInfo: localInfos});

    if (multicastSocket) {
      localSocket.send(discoveryMsg, 0, discoveryMsg.length, multicastInfos.port, multicastInfos.host);
    } else if (discoveryAddrs) {
      _.forEach(discoveryAddrs, function (container) {
        localSocket.send(discoveryMsg, 0, discoveryMsg.length, container.port, container.host);
      });
    }
  }

  setTimeout(function () {
    if (EventEmitter.listenerCount(events, aid + '!found') > 0) {
      internalSearch(aid);
    }
  }, discoveryTimeout);
}

/**
 * Discovery message handler
 * @param {Buffer} buffer
 */
function onDiscoveryMessage(buffer) {
  if (!buffer || !buffer.length) return;
  var message;
  try {
    message = decodeDiscoveryMessage(buffer);
  } catch (err) {
    return logger.makeLog('warn', 'hub-21', 'error parsing incomming discovery message...', err);
  }
  if (message && message.type === 'search' && message.from !== h.ID) {
    onDiscoverySearch(message);
  } else if (message && message.type === 'result' && message.to === h.ID) {
    onDiscoveryResult(message);
  }
}

/**
 * Discovery search handler
 * @param message {object} incomming search request
 */
function onDiscoverySearch(message) {
  logger.makeLog('trace', 'hub-7', 'search request for actor ' + message.aid + ' received from node ' + message.from, {netInfo: message.netInfo});
  var aids = actors.pickAll(message.aid, actors.scope.PROCESS);
  if (!_.isEmpty(aids)) {
    logger.makeLog('trace', 'hub-8', 'actor ' + message.aid + ' for node ' + message.from + ' found !', {netInfo: message.netInfo});
    _.forEach(aids, function (aid) {
      var response = encodeDiscoveryMessage({type: 'result', from: h.ID, to: message.from, aid: aid, netInfo: h.netInfo});
      localSocket.send(response, 0, response.length, message.netInfo.port, message.netInfo.host);
    });
  }
}

/**
 * Discovery result handler
 * @param message {object} incomming result
 */
function onDiscoveryResult(message) {
  logger.makeLog('trace', 'hub-9', 'actor ' + message.aid + ' found on node ' + message.from, {message: message});
  actors.add({id: message.aid, container: {id: message.from, netInfo: message.netInfo}});
  events.emit(message.aid + '!found', message.aid);
  events.emit(utils.aid.bare(message.aid) + '!found', message.aid);
}

/**
 * Encode a discovery message into a buffer following the discovery protocol
 * @param message {object} Discovery message
 * @returns {Buffer}
 */
function encodeDiscoveryMessage(message) {
  var sep = new Buffer([7]);
  var result = null;
  var type, from, aid;

  if (message.type === 'search') {
    type = new Buffer([0]);
    from = new Buffer(message.from, 'utf8');
    aid = new Buffer(message.aid, 'utf8');
    var senderHost = new Buffer(message.netInfo.host, 'utf8');
    var senderPort = new Buffer(2);
    senderPort.writeUInt16BE(message.netInfo.port, 0);
    result = Buffer.concat([type, sep, from, sep, aid, sep, senderHost, sep, senderPort]);
  } else if (message.type === 'result') {
    type = new Buffer([1]);
    from = new Buffer(message.from, 'utf8');
    var to = new Buffer(message.to, 'utf8');
    aid = new Buffer(message.aid, 'utf8');
    var ip = new Buffer(message.netInfo.ip, 'utf8');
    var pid = new Buffer(4);
    pid.writeUInt32BE(message.netInfo.pid, 0);
    var port = new Buffer(2);
    port.writeUInt16BE(message.netInfo.port, 0);
    result = Buffer.concat([type, sep, from, sep, to, sep, aid, sep, ip, sep, pid, sep, port]);
  }

  return result;
}

/**
 * Decode a discovery buffer into a discovery object
 * @param buffer {Buffer}
 * @returns {object} decoded discovery buffer
 */
function decodeDiscoveryMessage(buffer) {
  var result = null;
  var type, from, aid;
  var bufferComponents = splitDiscoveryBuffer(buffer);

  if (bufferComponents.length === 5 && bufferComponents[0][0] === 0) {
    type = 'search';
    from = bufferComponents[1].toString('utf8');
    aid = bufferComponents[2].toString('utf8');
    var senderHost = bufferComponents[3].toString('utf8');
    var senderPort = bufferComponents[4].readUInt16BE(0);
    result = {type: type, from: from, aid: aid, netInfo: {host: senderHost, port: senderPort}};
  } else if (bufferComponents.length === 7 && bufferComponents[0][0] === 1) {
    type = 'result';
    from = bufferComponents[1].toString('utf8');
    var to = bufferComponents[2].toString('utf8');
    aid = bufferComponents[3].toString('utf8');
    var ip = bufferComponents[4].toString('utf8');
    var pid = bufferComponents[5].readUInt32BE(0);
    var port = bufferComponents[6].readUInt16BE(0);
    result = {type: type, from: from, to: to, aid: aid, netInfo: {ip: ip, pid: pid, port: port}};
  } else {
    throw new Error('malformat discovery message');
  }

  return result;
}

/**
 * Split a discovery buffer on separator value
 * @param buffer {Buffer} Incoming discovery buffer
 * @returns {Array} Array of buffer splitted based on separator value
 */
function splitDiscoveryBuffer(buffer) {
  var result = [];
  var lastOffset = 0;
  var i = -1;
  while (++i < buffer.length) {
    if (buffer[i] === 7) {
      if (lastOffset <= i) {
        result.push(buffer.slice(lastOffset, i));
      }
      lastOffset = i + 1;
    }
  }
  result.push(buffer.slice(lastOffset));
  return result;
}
