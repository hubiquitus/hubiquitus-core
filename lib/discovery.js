/**
 * @module discovery
 */

var hubiquitus = require("./hubiquitus");
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
    if (err) logger.makeLog("err", "hub-5", {ID: ID, err: err});
  });
  subDiscovery.connect(addr, function (err) {
    if (err) logger.makeLog("err", "hub-6", {ID: ID, err: err});
  });
  subDiscovery.subscribe("").on("message", onDiscoveryMessage);
};

//TODO stop

/**
 * Search for aid
 * @params {string} aid
 */
exports.search = function (aid, callback) {
  events.once(reqAid + "!found", callback);
  pubDiscovery.send(new Buffer(JSON.stringify({type: "search", from: hubiquitus.ID, aid: aid})));
};

/**
 * Discovery message handler
 * @param {Buffer} buffer
 */
function onDiscoveryMessage(buffer) {
  if (!buffer || !buffer.length) return;
  var message = JSON.parse(buffer.toString());
  if (message.type === "search" && message.from !== ID) {
    onDiscoverySearch(message);
  } else if (message.type === "result" && message.to === ID) {
    onDiscoveryResult(message);
  }
}

/**
 * Discovery search handler
 * @param message {object} incomming search request
 */
function onDiscoverySearch(message) {
  logger.makeLog("trace", "hub-7", {msg: "search request for actor " + message.aid + " received", ID: ID});
  var aids = actors.pickAll(message.aid);
  if (!_.isEmpty(aids)) {
    logger.makeLog("trace", "hub-8", {msg: "actor " + message.aid + " found !", ID: ID});
    var netInfo = {/* TODO put ip, pid, port, ipc */};
    var response = {type: "result", from: ID, to: message.from, aid: message.aid, aids: aids, netInfo: netInfo};
    pubDiscovery.send(new Buffer(JSON.stringify(response)));
  }
}

/**
 * Discovery result handler
 * @param message {object} incomming result
 */
function onDiscoveryResult(message) {
  logger.makeLog("trace", "hub-9", {msg: "actors " + message.aids + " found on node " + message.from, ID: ID});
  _.forEach(message.aids, function (aid) {
    actors.add({aid: aid, container: {id: message.from, netInfo: message.netInfo}});
  });
  var aid = message.aids[_.random(message.aids.length - 1)];
  events.emit(message.aid + "!found", aid);
}
