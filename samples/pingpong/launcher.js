/**
 * @module ping-pong sample
 * Two distincts actors are playing ping pong in the same container.
 * We add both actors to the container and then start it.
 * Finally, we launch the game sending a PONG message.
 * Start function can be called at anytime : messages are queued until the container starts.
 */

var hubiquitus = require(__dirname + '/../../index');
var logger = hubiquitus.logger('hubiquitus:core:samples');
hubiquitus.logger.enable('hubiquitus:*');
hubiquitus.logger.level('hubiquitus:core', 'warn');

hubiquitus
  .addActor('ping', function (req) {
    logger.info(this.id + '> from ' + req.from + ' : ' + req.content);
    this.send(req.from, 'PING');
  })
  .addActor('pong', function (req) {
    logger.info(this.id + '> from ' + req.from + ' : ' + req.content);
    this.send(req.from, 'PONG');
  })
  .start()
  .send('pong', 'ping', 'PONG');
