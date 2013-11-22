/**
 * @module ping-remote launcher 2
 * Two actors play ping-pong in two differents containers.
 * Container2: start the container and add actor, then launch the game sending a PING message.
 * discorveryAddr option should be a multicast or unicast address.
 * discoveryAddr is used for containers mutual discovery and therefore remotes actors discovery.
 *
 * Actors mutual discovery use a retry algorithm. Send command can be invoked in both launchers
 * (a message can be send to a target even if it doesn't exists. As soon as it appears,
 * message will be delivered). In this sample, send command will retry for 2mn (=120000 ms).
 * @see {@link discovery}
 */

var hubiquitus = require(__dirname + '/../../lib/hubiquitus');
var logger = require(__dirname + '/../../lib/logger');

logger.level = 'info';

//hubiquitus.set('discoveryAddrs', ['udp://192.168.0.50:4444']);
//hubiquitus.start({discoveryPort: 4445})
hubiquitus.start({discoveryAddr: 'udp://224.0.0.1:5555'})
  .addActor('player2', require('./player')())
  .send('player2', 'player1', 'PING', 120000);
