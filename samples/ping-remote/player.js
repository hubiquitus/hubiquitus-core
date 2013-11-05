/**
 * @module ping-ipc actor
 */

var logger = require(__dirname + "/../../lib/logger");

module.exports = function () {
  var count = 0;

  return function (message) {
    logger.info("[" + this.id + "] ping from " + message.from + " (" + ++count + " total)");
    this.send(message.from, "ping");
  };
};
