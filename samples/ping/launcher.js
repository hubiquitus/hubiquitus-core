/**
 * @module ping sample
 * Two actors with same implementation (function) play ping pong in the same container.
 * We start the container and add both actors.
 * Finally, we launch the game sending a PING message.
 * Start function can be called at anytime : messages are queued until the container starts.
 */

var hubiquitus = require(__dirname + '/../../index');
var logger = hubiquitus.logger('hubiquitus:core:samples');
hubiquitus.logger.enable('hubiquitus:*');
hubiquitus.logger.level('hubiquitus:*', 'trace');

hubiquitus.start()
  .addActor('player1', require('./player')())
  .addActor('player2', require('./player')())
  .send('player1', 'player2', 'PING');
