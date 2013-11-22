/**
 * @module ping-ipc launcher 2
 * Two actors play ping-pong in two differents containers.
 * Container2: start the container and add actor, then launch the game sending a PING message.
 */

var hubiquitus = require(__dirname + '/../../lib/hubiquitus');
var logger = require(__dirname + '/../../lib/logger');

logger.level = 'info';

//hubiquitus.set('discoveryAddrs', ['udp://192.168.0.50:4444']);
//hubiquitus.start({discoveryPort: 4445})
hubiquitus.start({discoveryAddr: 'udp://224.0.0.1:5555'})
  .addActor('player2', require('./player')())
  .send('player2', 'player1', 'PING');
