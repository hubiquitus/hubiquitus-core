/**
 * @module pingpong sample
 */

var hubiquitus = require(__dirname + '/../../lib/hubiquitus');
var logger = require(__dirname + '/../../lib/logger');

logger.level = 'debug';

hubiquitus.start(function () {
  logger.info('hubiquitus started');
});

hubiquitus
  .addActor('ping', function (from, content) {
    logger.info(this.id + '> from ' + from + ' : ' + content);
    this.send(from, 'ping');
  })
  .addActor('pong', function (from, content) {
    logger.info(this.id + '> from ' + from + ' : ' + content);
    this.send(from, 'pong');
  })
  .send('pong', 'ping', {payload: 'pong'});
