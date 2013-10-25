/**
 * @module ping-ipc launcher 2
 */

var hubiquitus = require(__dirname + "/../../lib/hubiquitus");
var logger = require(__dirname + "/../../lib/logger");

logger.level = "trace";

hubiquitus
  .addActor("pong", require("./../ping/player")())
  .start()
  .send("ping", "pong", {payload: "ping"});
