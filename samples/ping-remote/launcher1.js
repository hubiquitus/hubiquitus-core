/**
 * @module ping-remote launcher 1
 * Two actors play ping-pong in two differents containers.
 * Container1: start the container and add actor.
 * discorveryAddr option should be a multicast or unicast address.
 * discoveryAddr is used for containers mutual discovery and therefore remotes actors discovery.
 *
 * Actors mutual discovery use a retry algorithm. Send command can be invoked in both launchers
 * (a message can be send to a target even if it doesn't exists. As soon as it appears,
 * message will be delivered).
 * @see {@link discovery}
 */

var hubiquitus = require(__dirname + '/../../index');
var logger = hubiquitus.logger('hubiquitus:core:samples');
hubiquitus.logger.enable('hubiquitus:*');

//hubiquitus.set('discoveryAddrs', ['udp://192.168.0.50:4445']);
//hubiquitus.start({discoveryPort: 4444})
hubiquitus.start({stats: {enabled: 'true', host: 'localhost', port: 5555}, discoveryAddr: 'udp://224.0.0.1:5555'})
  .addActor('player1', require('./player')())
  .addActor('player2', require('./player')())
  .addActor('player3', require('./player')());
