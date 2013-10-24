/**
 * @module pingpong sample
 */

var hubiquitus = require(__dirname + "/../../lib/hubiquitus");
var logger = require(__dirname + "/../../lib/logger");

logger.level = "debug";

hubiquitus
  .addActor("ping/1", require("./player")())
  .addActor("ping/2", require("./player")())
  .send("ping/1", "ping/2", {payload: "ping"});
