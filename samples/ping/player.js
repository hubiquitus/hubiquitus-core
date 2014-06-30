/**
 * @module ping actor
 * Ping response is sent with a random delay.
 * Each time exports is called, it creates a new actor (function) with a private scope.
 */

var hubiquitus = require(__dirname + '/../../index');
var logger = hubiquitus.logger('hubiquitus:core:samples');

module.exports = function () {
  var count = 0;

  return function (req) {
    logger.info('[' + req.to + '] ' + req.content + ' from ' + req.from + ' (' + (++count) + ' total)');
    setTimeout((function () {
      hubiquitus.send(req.to, req.from, 'PING');
    }).bind(this), parseInt(Math.random() * 490) + 10);
  };
};
