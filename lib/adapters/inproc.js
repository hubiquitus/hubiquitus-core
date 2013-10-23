/**
 * @module inproc adapter
 */

var hubiquitus = require("../hubiquitus");
var logger = require("../logger");

exports.send = function (message) {
  process.nextTick(function () {
    exports.onMessage(message);
  });
};

exports.onMessage = function (message) {
  logger.warn("inproc onMessage should be overriden");
};
