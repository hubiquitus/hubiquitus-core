/**
 * @module ping-ipc actor
 */

var hubiquitus = require(__dirname + '/../../index');
var logger = hubiquitus.logger('hubiquitus:core:samples');

module.exports = function () {
  var count = 0;

  return function (req) {
    if (++count%1000 === 0)
      logger.info('[' + req.to + '] ' + req.content + ' from ' + req.from + ' (' + count + ' total)');
    hubiquitus.send(req.to, req.from, 'ping');
  };
};
