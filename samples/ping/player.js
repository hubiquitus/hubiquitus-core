/**
 * @module ping actor
 */

var logger = require("../../lib/logger");

module.exports = function () {
  var count = 0;

  return function (message) {
    logger.info("[" + this.id + "] ping from " + message.from + " (" + ++count + " total)");
    setTimeout((function () {
      this.send(message.from, "ping");
    }).bind(this), 500);
  };
};
