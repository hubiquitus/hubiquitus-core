/**
 * @module ping-ipc launcher 2
 */

var hubiquitus = require(__dirname + "/../../lib/hubiquitus");
var logger = require(__dirname + "/../../lib/logger");

logger.level = "trace";

hubiquitus.start()
  .addActor("pong", require("./../ping/player")())
  .send("pong", "ping", "ping");
