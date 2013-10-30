/**
 * @module discovery
 */

var h = require("./hubiquitus");
var actors = require("./actors");
var zmq = require("zmq");
var EventEmitter = require("events").EventEmitter;
var _ = require("lodash");

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
 * Starts containers discovery
 * @param {string} addr
 */
exports.start = function (addr) {
  pubDiscovery.bind(addr, function (err) {
    if (err) logger.makeLog("err", "hub-5", {ID: h.ID, err: err});
  });
  subDiscovery.connect(addr, function (err) {
    if (err) logger.makeLog("err", "hub-6", {ID: h.ID, err: err});
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
  pubDiscovery.send(new Buffer(JSON.stringify({type: "search", from: h.ID, aid: aid})));
};

/**
 * Discovery message handler
 * @param {Buffer} buffer
 */
function onDiscoveryMessage(buffer) {
  if (!buffer || !buffer.length) return;
  var message = JSON.parse(buffer.toString());
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
  logger.makeLog("trace", "hub-7", {msg: "search request for actor " + message.aid + " received", ID: h.ID});
  var aids = actors.pickAll(message.aid);
  if (!_.isEmpty(aids)) {
    logger.makeLog("trace", "hub-8", {msg: "actor " + message.aid + " found !", ID: h.ID});
    var response = {type: "result", from: h.ID, to: message.from, aid: message.aid, aids: aids, netInfo: h.netInfo};
    pubDiscovery.send(new Buffer(JSON.stringify(response)));
  }
}

/**
 * Discovery result handler
 * @param message {object} incomming result
 */
function onDiscoveryResult(message) {
  logger.makeLog("trace", "hub-9", {msg: "actors " + message.aids + " found on node " + message.from, ID: h.ID});
  _.forEach(message.aids, function (aid) {
    actors.add({id: aid, container: {id: message.from, netInfo: message.netInfo}});
  });
  var aid = message.aids[_.random(message.aids.length - 1)];
  events.emit(message.aid + "!found", aid);
}
