/**
 * @module ping actor
 * Ping response is sent with a random delay.
 * Each time exports is called, it creates a new actor (function) with a private scope.
 */

var hubiquitus = require(__dirname + '/../../index');
var logger = hubiquitus.logger('hubiquitus:core-samples');

module.exports = function () {
  var count = 0;

  return function (from, content) {
    logger.info('[' + this.id + '] ' + content + ' from ' + from + ' (' + (++count) + ' total)');
    setTimeout((function () {
      this.send(from, 'PING');
    }).bind(this), parseInt(Math.random() * 490) + 10);
  };
};
