/**
 * @module discovery
 */

var _ = require("lodash");
var punt = require("punt");
var EventEmitter = require("events").EventEmitter;

var h = require("./hubiquitus");
var actors = require("./actors");
var logger = require("./logger");
var utils = {
  aid: require("./utils/aid")
};

/**
 * @type {Socket}
 */
var pubDiscovery = null;

/**
 * @type {Socket}
 */
var subDiscovery = null;

/**
 * @type {EventEmitter}
 */
var events = new EventEmitter();

/**
 * @type {number}
 */
var discoveryTimeout = 60000;

/**
 * Starts containers discovery
 * @param {string} addr sample "udp://224.0.0.1:5555"
 */
exports.start = function (addr, done) {
  subDiscovery = punt.bind(addr);
  pubDiscovery = punt.connect(addr);
  subDiscovery.on("message", onDiscoveryMessage);
  done();
};

/**
 * Stops containers discovery
 */
exports.stop = function () {
  subDiscovery.removeAllListeners("message")
  subDiscovery = null;
  pubDiscovery = null;
};

/**
 * Search for aid
 * @params {string} aid
 */
exports.search = function (aid, callback) {
  events.once(aid + "!found", callback);
  if (events.listeners(aid + "!found").length > 0) {
    internalSearch(aid);
  } else {
    logger.makeLog("trace", "hub-20", "discovery on " + aid + " already in progress...");
  }
};

/**
 * Launch discovery with timeout management
 * @param {string} aid
 */
function internalSearch(aid) {
  pubDiscovery.send(encodeDiscoveryMsg({type: "search", from: h.ID, aid: aid}));
  setTimeout(function () {
    if (EventEmitter.listenerCount(events, aid + "!found") > 0) {
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
    message = decodeDiscoveryMsg(buffer);
  } catch (err) {
    return logger.makeLog("warn", "hub-21", "error parsing incomming discovery message...", err);
  }
  if (message && message.type === "search" && message.from !== h.ID) {
    onDiscoverySearch(message);
  } else if (message && message.type === "result" && message.to === h.ID) {
    onDiscoveryResult(message);
  }
}

/**
 * Discovery search handler
 * @param message {object} incomming search request
 */
function onDiscoverySearch(message) {
  logger.makeLog("trace", "hub-7", "search request for actor " + message.aid + " received from node " + message.from);
  var aids = actors.pickAll(message.aid, actors.scope.PROCESS);
  if (!_.isEmpty(aids)) {
    logger.makeLog("trace", "hub-8", "actor " + message.aid + " found !");
    _.forEach(aids, function (aid) {
      var response = encodeDiscoveryMsg({type: "result", from: h.ID, to: message.from, aid: aid, netInfo: h.netInfo});
      pubDiscovery.send(response);
    });
  }
}

/**
 * Discovery result handler
 * @param message {object} incomming result
 */
function onDiscoveryResult(message) {
  logger.makeLog("trace", "hub-9", "actor " + message.aid + " found on node " + message.from, {message: message});
  actors.add({id: message.aid, container: {id: message.from, netInfo: message.netInfo}});
  events.emit(message.aid + "!found", message.aid);
  events.emit(utils.aid.bare(message.aid) + "!found", message.aid)
}

/**
 * Encode a discovery msg into a buffer following the discovery protocol
 * @param msg {object} Discovery message
 * @returns {Buffer}
 */
function encodeDiscoveryMsg(msg) {
  var separator = new Buffer([7]);
  var result = null;

  if (msg.type === "search") {
    var type = new Buffer([0]);
    var from = new Buffer(msg.from, "utf8");
    var aid = new Buffer(msg.aid, "utf8");
    result = Buffer.concat([type, separator, from, separator, aid]);
  } else if (msg.type === "result") {
    var type = new Buffer([1]);
    var from = new Buffer(msg.from, "utf8");
    var to = new Buffer(msg.to, "utf8");
    var aid = new Buffer(msg.aid, "utf8");
    var ip = new Buffer(msg.netInfo.ip, "utf8");
    var pid = (new Buffer(4))
    pid.writeUInt32BE(msg.netInfo.pid, 0);
    var port = (new Buffer(2))
    port.writeUInt16BE(msg.netInfo.port, 0);
    result = Buffer.concat([type, separator, from, separator, to, separator, aid, separator, ip, separator, pid, separator, port]);
  }

  return result;
}

/**
 * Decode a discovery buffer into a discovery object
 * @param buffer {Buffer}
 * @returns {object} decoded discovery buffer
 */
function decodeDiscoveryMsg(buffer) {
  var result = null;
  var bufferComponents = splitDiscoveryBuffer(buffer);

  if(bufferComponents.length === 3 && bufferComponents[0][0] === 0) {
    var type = "search";
    var from = bufferComponents[1].toString("utf8");
    var aid = bufferComponents[2].toString("utf8");
    result = {type:type, from:from, aid:aid};

  } else if (bufferComponents.length === 7 && bufferComponents[0][0] === 1) {
    var type = "result";
    var from = bufferComponents[1].toString("utf8");
    var to = bufferComponents[2].toString("utf8");
    var aid = bufferComponents[3].toString("utf8");
    var ip = bufferComponents[4].toString("utf8");
    var pid = bufferComponents[5].readUInt32BE(0);
    var port = bufferComponents[6].readUInt16BE(0);
    result = {type: type, from: from, to: to, aid: aid, netInfo: {ip: ip, pid: pid, ipc: "unix:///tmp/" + from, tcp: "tcp://" + ip + ":" + port}};
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
  while(++i < buffer.length) {
    if(buffer[i] === 7) {
      if(lastOffset <= i) {
        result.push(buffer.slice(lastOffset, i));
      }
      lastOffset = i+1;
    }
  }
  result.push(buffer.slice(lastOffset));
  return result;
}

