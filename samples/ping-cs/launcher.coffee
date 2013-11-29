#
# @module ping-cs sample
# Two actors, instances of the same class play ping pong in the same container.
# We start the container and add both actors binding it to a scope (the instance).
# Finally, we launch the game sending a PING message.
# Start function can be called at anytime : messages are queued until the container starts.
#


hubiquitus = require(__dirname + '/../../index')
logger = hubiquitus.logger('hubiquitus:core-samples')
hubiquitus.logger.enable('hubiquitus:*')
hubiquitus.logger.level('hubiquitus:core', 'warn')
hubiquitus.logger.level('hubiquitus:core-samples', 'debug')
Player = require('./player')

player1 = new Player
player2 = new Player

hubiquitus.addActor('player1', player1.onMessage, player1)
hubiquitus.addActor('player2', player2.onMessage, player2)

hubiquitus.start()

hubiquitus.send('player1', 'player2', 'PING')
