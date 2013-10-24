#
# @module ping actor
#

hubiquitus = require __dirname + "/../../lib/hubiquitus"
logger = require __dirname + "/../../lib/logger"
Player = require "./player"

logger.level = "debug"

player1 = new Player
hubiquitus.addActor "ping/1", player1.onMessage, player1
player2 = new Player
hubiquitus.addActor "ping/2", player2.onMessage, player2

hubiquitus.send "ping/1", "ping/2", {payload: "ping"}
