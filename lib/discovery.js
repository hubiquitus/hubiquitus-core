/**
 * @module discovery
 */

var _ = require("lodash");
var zmq = require("zmq");
var EventEmitter = require("events").EventEmitter;

var h = require("./hubiquitus");
var actors = require("./actors");
var logger = require("./logger");

/**
 * @type {Socket}
 */
var pubDiscovery = zmq.socket("pub");

/**
 * @type {Socket}
 */
var subDiscovery = zmq.socket("sub");

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
 * @param {string} addr sample "epgm://224.0.0.1:5555"
 */
exports.start = function (addr) {
  pubDiscovery.bind(addr, function (err) {
    if (err) logger.makeLog("err", "hub-5", "discovery pub bind error", err);
  });
  subDiscovery.connect(addr, function (err) {
    if (err) logger.makeLog("err", "hub-6", "discovery sub conn error", err);
  });
  subDiscovery.subscribe("").on("message", onDiscoveryMessage);
};

/**
 * Stops containers discovery
 */
exports.stop = function () {
  pubDiscovery.close();
  subDiscovery.unsubscribe("");
  subDiscovery.disconnect();
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
  pubDiscovery.send(new Buffer(JSON.stringify({type: "search", from: h.ID, aid: aid})));
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
  try {
    var message = JSON.parse(buffer.toString());
  } catch (err) {
    return logger.makeLog("warn", "hub-21", "error parsing incomming discovery message...", err);
  }
  if (message.type === "search" && message.from !== h.ID) {
    onDiscoverySearch(message);
  } else if (message.type === "result" && message.to === h.ID) {
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
    var response = {type: "result", from: h.ID, to: message.from, aid: message.aid, aids: aids, netInfo: h.netInfo};
    pubDiscovery.send(new Buffer(JSON.stringify(response)));
  }
}

/**
 * Discovery result handler
 * @param message {object} incomming result
 */
function onDiscoveryResult(message) {
  logger.makeLog("trace", "hub-9", "actors " + message.aids + " found on node " + message.from, {message: message});
  _.forEach(message.aids, function (aid) {
    actors.add({id: aid, container: {id: message.from, netInfo: message.netInfo}});
  });
  var aid = message.aids[_.random(message.aids.length - 1)];
  events.emit(message.aid + "!found", aid);
}
