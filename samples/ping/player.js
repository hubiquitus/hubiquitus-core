/**
 * @module ping actor
 */

var logger = require("../../lib/logger");

module.exports = function () {
  var count = 0;

  return function (from, content) {
    logger.info("[" + this.id + "] " + content + " from " + from + " (" + (++count) + " total)");
    setTimeout((function () {
      this.send(from, "ping");
    }).bind(this), parseInt(Math.random() * 490) + 10);
  };
};
