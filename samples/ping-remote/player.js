/**
 * @module ping-ipc actor
 */

var hubiquitus = require(__dirname + '/../../index');
var logger = hubiquitus.logger('hubiquitus:core:samples');

module.exports = function () {
  var count = 0;

  return function (from, content, reply) {
    if (++count%1000 === 0)
      logger.info('[' + this.id + '] ' + content + ' from ' + from + ' (' + count + ' total)');
    this.send(from, 'ping');
  };
};
