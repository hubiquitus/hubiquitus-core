/**
 * @module discovery
 */

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var url = require('url');
var dgram = require('dgram');
var async = require('async');
var semver = require('semver');

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
 * @type {Array} Array of string with format http://192.168.0.1:5555
 */
var discoveryAddrs = null;

/**
 * Remote PODS discovery addrs
 * A pod is a group of containers collocated on se same multicast network
 * It can be a VM in public cloud or a datacenter in a multi datacenter
 * configuration.
 * @type {Array} Array of string with format http://192.168.0.1:2302 the list
 * must exclude the current POD address
 */
var podAddrs = null;

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
  if (semver.gt(process.version, '0.12.0'))
    localSock = dgram.createSocket({type:'udp4', reuseAddr: true});
  else
    localSock = dgram.createSocket('udp4');
  localSock.on('message', onMessage);

  if (params.addr) {
    var mcastAddr = url.parse(params.addr);
    mcastInfos.host = mcastAddr.hostname;
    mcastInfos.port = mcastAddr.port || 5555;
    if (semver.gt(process.version, '0.12.0'))
      mcastSock = dgram.createSocket({type:'udp4', reuseAddr: true});
    else
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
    if (params.pods) {
      // PODS are valuable only in case multicast is used. setPodAddrs also needs
      // localInfos to be initialised in order to work.
      setPodAddrs(params.pods);
    }
    started = true;
    locked = false;
    logger.makeLog('trace', 'hub-22', 'discovery started !');
    done && done();
  }
};

/**
 * Stops containers discovery
 * @param [done] {function} done callback
 */
exports.stop = function (done) {
  if (locked || !started) {
    var msg = locked ? 'busy' : 'already stopped';
    return logger.makeLog('warn', 'hub-39', 'attempt to stop container while ' + msg + ' !');
  }

  _.forEach(researchesLoops, function (loop, aid) {
    logger.makeLog('trace', 'hub-47', 'stop discovery for ' + aid + '; stoping discovery');
    clearTimeout(loop);
  });

  lastResearches = {};
  researchesLoops = {};

  if (localSock) {
    localSock.close();
    localSock = null;
  }

  if (mcastSock) {
    mcastSock.close();
    mcastSock = null;
  }

  started = false;

  logger.makeLog('trace', 'hub-54', 'discovery stopped !');
  done && done();
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
 * Set PODS addresses
 * @param value
 */
function setPodAddrs (value) {
  if (_.isArray(value)) {
    podAddrs = [];
    _.forEach(value, function (addr) {
      var addrComp = url.parse(addr);
      var host = addrComp.hostname;
      var port = addrComp.port || 5555;
      var infos = {host: host, port: parseInt(port)};
      // exclude current POD from the list of PODS
      if (infos.host !== localInfos.host || infos.port !== localInfos.port)
        podAddrs.push(infos);
    });
  } else {
    podAddrs = null;
  }
};

/**
 * Handle research notification
 * @param aid {string}
 */
exports.notifySearched = function (aid) {
  aid = utils.aid.bare(aid);
  if (!lastResearches[aid]) {
    lastResearches[aid] = Date.now();
    logger.makeLog('trace', 'hub-11', 'start discovery for ' + aid);
    exports.emit('discovery started', aid);
    (function tick(aid) {
      if (started && Date.now() - lastResearches[aid] < properties.discoveryTimeout) {
        logger.makeLog('trace', 'hub-45', 'discovery for ' + aid);
        exports.emit('discovery', aid);
        search(aid);
        researchesLoops[aid] = setTimeout(function () {
          tick(aid);
        }, _.random(properties.discoveryMinInterval, properties.discoveryMaxInterval));
      } else {
        logger.makeLog('trace', 'hub-12', 'stop discovery for ' + aid + '; too much time since last request');
        delete lastResearches[aid];
        delete researchesLoops[aid];
        exports.emit('discovery stopped', aid);
      }
    })(aid);
  } else {
    logger.makeLog('trace', 'hub-49', 'update last notify date for ' + aid);
    lastResearches[aid] = Date.now();
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
  var msg = encode({type: 'search', from: properties.ID, vfrom: properties.name, aid: aid, netInfo: localInfos});
  // remote search message for POD discovery
  var remoteMsg = encode({type: 'remoteSearch', from: properties.ID, vfrom: properties.name, aid: aid, netInfo: localInfos});
  if (mcastSock) {
    localSock.send(msg, 0, msg.length, mcastInfos.port, mcastInfos.host);
    if (podAddrs) {
      _.forEach(podAddrs, function (container) {
        logger.makeLog('trace', 'hub-55', 'RemoteSearch to ' + JSON.stringify(container) + ' : ' + JSON.stringify(remoteMsg));
        localSock.send(remoteMsg, 0, remoteMsg.length, container.port, container.host);
      });
    }
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
  } else if (msg && msg.type === 'remoteSearch') {
    // when receiving a remote search message -> forward it to the POD multicast address
    var multiCastMsg = encode({type: 'search', from: msg.from, vfrom: msg.vfrom, aid: msg.aid, netInfo: msg.netInfo});
    localSock.send(multiCastMsg, 0, multiCastMsg.length, mcastInfos.port, mcastInfos.host);
  } else if (msg && msg.type === 'result' && msg.to === properties.ID) {
    onResult(msg);
  }
}

/**
 * Discovery search handler
 * @param msg {object} incomming search request
 */
function onSearch(msg) {
  logger.makeLog('trace', 'hub-7', 'search request for actor ' + msg.aid + ' received from node ' + msg.vfrom + ' (ID ' + msg.from + ')', {netInfo: msg.netInfo});
  var aids = actors.getAll(msg.aid, actors.scope.PROCESS);
  if (!_.isEmpty(aids)) {
    logger.makeLog('trace', 'hub-8', 'actor ' + msg.aid + ' for node ' + msg.vfrom + ' (ID ' + msg.from + ') found !', {netInfo: msg.netInfo});
    _.forEach(aids, function (aid) {
      var res = encode({type: 'result', from: properties.ID, vfrom: properties.name, to: msg.from, aid: aid, netInfo: properties.netInfo});
      localSock.send(res, 0, res.length, msg.netInfo.port, msg.netInfo.host);
    });
  }
}

/**
 * Discovery result handler
 * @param msg {object} incomming result
 */
function onResult(msg) {
  logger.makeLog('trace', 'hub-9', 'actor ' + msg.aid + ' found on node ' + msg.vfrom + ' (ID ' + msg.from + ')', {msg: msg});
  actors.add({id: msg.aid, container: {id: msg.from, name: msg.vfrom, netInfo: msg.netInfo}});
}

/**
 * Encode a discovery message into a buffer following the discovery protocol
 * @param msg {object} Discovery message
 * @returns {Buffer}
 */
function encode(msg) {
  var result = null;
  var type, from, vfrom, aid;
  var senderHost, senderPost;

  if (msg.type === 'search') {
    type = new Buffer([0]);
    from = new Buffer(msg.from, 'utf8');
    vfrom = new Buffer(msg.vfrom, 'utf8');
    aid = new Buffer(msg.aid, 'utf8');
    senderHost = new Buffer(msg.netInfo.host, 'utf8');
    senderPort = new Buffer(2);
    senderPort.writeUInt16BE(msg.netInfo.port, 0);
    result = concatBuffers([type, from, vfrom, aid, senderHost, senderPort]);
  } else if (msg.type === 'remoteSearch') {
    type = new Buffer([0]);
    from = new Buffer(msg.from, 'utf8');
    vfrom = new Buffer(msg.vfrom, 'utf8');
    aid = new Buffer(msg.aid, 'utf8');
    senderHost = new Buffer(msg.netInfo.host, 'utf8');
    senderPort = new Buffer(2);
    senderPort.writeUInt16BE(msg.netInfo.port, 0);
    result = concatBuffers([type, from, vfrom, aid, senderHost, senderPort]);
  } else if (msg.type === 'result') {
    type = new Buffer([1]);
    from = new Buffer(msg.from, 'utf8');
    vfrom = new Buffer(msg.vfrom, 'utf8');
    var to = new Buffer(msg.to, 'utf8');
    aid = new Buffer(msg.aid, 'utf8');
    var ip = new Buffer(msg.netInfo.ip, 'utf8');
    var pid = new Buffer(4);
    pid.writeUInt32BE(msg.netInfo.pid, 0);
    var port = new Buffer(2);
    port.writeUInt16BE(msg.netInfo.port, 0);
    result = concatBuffers([type, from, vfrom, to, aid, ip, pid, port]);
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
  var type, from, vfrom, aid;
  var bufferComponents = splitBuffers(buffer);
  var idx = 0;

  if (bufferComponents.length === 6 && nextBuffer()[0] === 0) {
    type = 'search';
    from = nextBuffer().toString('utf8');
    vfrom = nextBuffer().toString('utf8');
    aid = nextBuffer().toString('utf8');
    var senderHost = nextBuffer().toString('utf8');
    var senderPort = nextBuffer().readUInt16BE(0);
    result = {type: type, from: from, vfrom: vfrom, aid: aid, netInfo: {host: senderHost, port: senderPort}};
  } else if (bufferComponents.length === 8 && nextBuffer()[0] === 1) {
    type = 'result';
    from = nextBuffer().toString('utf8');
    vfrom = nextBuffer().toString('utf8');
    var to = nextBuffer().toString('utf8');
    aid = nextBuffer().toString('utf8');
    var ip = nextBuffer().toString('utf8');
    var pid = nextBuffer().readUInt32BE(0);
    var port = nextBuffer().readUInt16BE(0);
    result = {type: type, from: from, vfrom: vfrom, to: to, aid: aid, netInfo: {ip: ip, pid: pid, port: port}};
  } else {
    throw new Error('malformat discovery message');
  }

  function nextBuffer() {
    return bufferComponents[idx++];
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
