#
# @module ping-cs sample
#

hubiquitus = require __dirname + "/../../lib/hubiquitus"
logger = require __dirname + "/../../lib/logger"
Player = require "./player"

logger.level = "debug"

player1 = new Player
hubiquitus.addActor "ping", player1.onMessage, player1
player2 = new Player
hubiquitus.addActor "pong", player2.onMessage, player2

hubiquitus.send "ping", "pong", {payload: "ping"}
