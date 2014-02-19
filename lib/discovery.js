/**
 * @module discovery
 */

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var url = require('url');
var dgram = require('dgram');
var async = require('async');

var properties = require('./properties');
var actors = require('./actors');
var logger = require('./logger')('hubiquitus:core:discovery');
var utils = {
  aid: require('./utils/aid')
};

exports.__proto__ = new EventEmitter();
exports.setMaxListeners(0);

/**
 * @type {boolean}
 */
var started = false;

/**
 * @type {boolean}
 */
var locked = false;

/**
 * @type {Socket}
 */
var mcastSock = null;

/**
 * @type {Socket}
 */
var localSock = null;

/**
 * @type {object}
 */
var lastResearches = {};

/**
 * @type {object}
 */
var researchesLoops = {};

/**
 * Local socket infos
 * @type {object}
 */
var localInfos = {};

/**
 * Multicast/Broadcast discovery socket infos
 * @type {object}
 */
var mcastInfos = {};

/**
 * Remote containers discovery addrs
 * @type {Array} Array of string with format udp://192.168.0.1:5555
 */
var discoveryAddrs = null;

/**
 * Starts containers discovery
 * @param params {object} discovery parameters
 * @param [done] {function} done callback
 */
exports.start = function (params, done) {
  if (locked || started) {
    var msg = locked ? 'busy' : 'already started';
    return logger.makeLog('warn', 'hub-38', 'attempt to start discovery while ' + msg + ' !');
  }

  locked = true;

  localInfos.host = properties.netInfo.ip;
  localInfos.port = params.port || _.random(3000, 60000);
  localSock = dgram.createSocket('udp4');
  localSock.on('message', onMessage);

  if (params.addr) {
    var mcastAddr = url.parse(params.addr);
    mcastInfos.host = mcastAddr.hostname;
    mcastInfos.port = mcastAddr.port || 5555;
    mcastSock = dgram.createSocket('udp4');
    mcastSock.on('message', onMessage);
  }

  if (!mcastSock) {
    localSock.bind(localInfos.port, localInfos.host, onStart);
  } else {
    async.parallel([
      function (done) { localSock.bind(localInfos.port, localInfos.host, done); },
      function (done) { mcastSock.bind(mcastInfos.port, mcastInfos.host, done); }
    ], onStart);
  }

  function onStart() {
    started = true;
    locked = false;
    logger.makeLog('trace', 'hub-22', 'discovery started !');
    done && done();
  }
};

/**
 * Stops containers discovery
 */
exports.stop = function () {
  if (locked || !started) {
    var msg = locked ? 'busy' : 'already stopped';
    return logger.makeLog('warn', 'hub-39', 'attempt to stop container while ' + msg + ' !');
  }

  _.forEach(researchesLoops, function (loop, aid) {
    logger.makeLog('trace', 'hub-47', 'stop discovery for ' + aid + '; stoping discovery');
    clearTimeout(loop);
  });

  if (localSock) {
    localSock.close();
    localSock = null;
  }

  if (mcastSock) {
    mcastSock.close();
    mcastSock = null;
  }

  started = false;

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
 * Handle research notification
 * @param aid {string}
 */
exports.notifySearched = function (aid) {
  aid = utils.aid.bare(aid);
  if (!lastResearches[aid]) {
    lastResearches[aid] = (new Date()).getTime();
    logger.makeLog('trace', 'hub-11', 'start discovery for ' + aid);
    exports.emit('discovery started', aid);
    (function tick(aid) {
      logger.makeLog('trace', 'hub-45', 'discovery for ' + aid);
      exports.emit('discovery', aid);
      search(aid);
      researchesLoops[aid] = setTimeout(function () {
        if (started && (new Date()).getTime() - lastResearches[aid] < properties.discoveryTimeout) {
          tick(aid);
        } else {
          logger.makeLog('trace', 'hub-12', 'stop discovery for ' + aid + '; too much time since last request');
          delete lastResearches[aid];
          exports.emit('discovery stopped', aid);
        }
      }, _.random(properties.discoveryMinInterval, properties.discoveryMaxInterval));
    })(aid);
  } else {
    lastResearches[aid] = (new Date()).getTime();
  }
};

/**
 * Returns current discoveries with the last research date for each of them
 * @returns {Object} discoveries
 */
exports.discoveries = function () {
  return lastResearches;
};

/**
 * Search for aid
 * @params {string} aid
 */
function search(aid) {
  logger.makeLog('trace', 'hub-10', 'searching actor ' + aid + '...');
  var msg = encode({type: 'search', from: properties.ID, aid: aid, netInfo: localInfos});

  if (mcastSock) {
    localSock.send(msg, 0, msg.length, mcastInfos.port, mcastInfos.host);
  } else if (discoveryAddrs) {
    _.forEach(discoveryAddrs, function (container) {
      localSock.send(msg, 0, msg.length, container.port, container.host);
    });
  }
}

/**
 * Discovery message handler
 * @param {Buffer} buffer
 */
function onMessage(buffer) {
  var msg;
  try {
    msg = decode(buffer);
  } catch (err) {
    return logger.makeLog('warn', 'hub-21', 'error parsing incomming discovery message...', err);
  }
  if (msg && msg.type === 'search' && msg.from !== properties.ID) {
    onSearch(msg);
  } else if (msg && msg.type === 'result' && msg.to === properties.ID) {
    onResult(msg);
  }
}

/**
 * Discovery search handler
 * @param msg {object} incomming search request
 */
function onSearch(msg) {
  logger.makeLog('trace', 'hub-7', 'search request for actor ' + msg.aid + ' received from node ' + msg.from, {netInfo: msg.netInfo});
  var aids = actors.pickAll(msg.aid, actors.scope.PROCESS);
  if (!_.isEmpty(aids)) {
    logger.makeLog('trace', 'hub-8', 'actor ' + msg.aid + ' for node ' + msg.from + ' found !', {netInfo: msg.netInfo});
    _.forEach(aids, function (aid) {
      var response = encode({type: 'result', from: properties.ID, to: msg.from, aid: aid, netInfo: properties.netInfo});
      localSock.send(response, 0, response.length, msg.netInfo.port, msg.netInfo.host);
    });
  }
}

/**
 * Discovery result handler
 * @param msg {object} incomming result
 */
function onResult(msg) {
  logger.makeLog('trace', 'hub-9', 'actor ' + msg.aid + ' found on node ' + msg.from, {msg: msg});
  actors.add({id: msg.aid, container: {id: msg.from, netInfo: msg.netInfo}});
}

/**
 * Encode a discovery message into a buffer following the discovery protocol
 * @param msg {object} Discovery message
 * @returns {Buffer}
 */
function encode(msg) {
  var result = null;
  var type, from, aid;

  if (msg.type === 'search') {
    type = new Buffer([0]);
    from = new Buffer(msg.from, 'utf8');
    aid = new Buffer(msg.aid, 'utf8');
    var senderHost = new Buffer(msg.netInfo.host, 'utf8');
    var senderPort = new Buffer(2);
    senderPort.writeUInt16BE(msg.netInfo.port, 0);
    result = concatBuffers([type, from, aid, senderHost, senderPort]);
  } else if (msg.type === 'result') {
    type = new Buffer([1]);
    from = new Buffer(msg.from, 'utf8');
    var to = new Buffer(msg.to, 'utf8');
    aid = new Buffer(msg.aid, 'utf8');
    var ip = new Buffer(msg.netInfo.ip, 'utf8');
    var pid = new Buffer(4);
    pid.writeUInt32BE(msg.netInfo.pid, 0);
    var port = new Buffer(2);
    port.writeUInt16BE(msg.netInfo.port, 0);
    result = concatBuffers([type, from, to, aid, ip, pid, port]);
  }

  return result;
}

/**
 * Decode a discovery buffer into a discovery object
 * @param buffer {Buffer}
 * @returns {object} decoded discovery buffer
 */
function decode(buffer) {
  if (!buffer || !buffer.length) return null;
  var result = null;
  var type, from, aid;
  var bufferComponents = splitBuffers(buffer);

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
 * Concat a discovery buffer adding fields buffer length split them
 * @param items {Array} array of buffers
 * @returns {Buffer} concatened buffer with fields length
 */
function concatBuffers(items) {
  var result = null;

  var length = 0;
  _.forEach(items, function (item) {
    length += 2 + item.length;
  });

  result = new Buffer(length);

  var offset = 0;
  _.forEach(items, function (item) {
    var itemLength = item.length;
    result.writeUInt16BE(itemLength, offset);
    offset += 2;
    item.copy(result, offset);
    offset += itemLength;
  });

  return result;
}

/**
 * Split a discovery buffer on each fields length
 * @param buffer {Buffer} incoming discovery buffer
 * @returns {Array} array of buffer splitted based on separator value
 */
function splitBuffers(buffer) {
  var result = [];
  var lastOffset = 0;
  var bufferLength = buffer.length;
  while (lastOffset < bufferLength) {
    var length = buffer.readUInt16BE(lastOffset);
    lastOffset += 2;
    if (length <= 0) return null;
    result.push(buffer.slice(lastOffset, lastOffset + length));
    lastOffset += length;
  }
  return result;
}
