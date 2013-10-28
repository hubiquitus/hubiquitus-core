/**
 * @module ping-ipc launcher 1
 */

var hubiquitus = require(__dirname + "/../../lib/hubiquitus");
var logger = require(__dirname + "/../../lib/logger");

logger.level = "trace";

hubiquitus.start()
  .addActor("ping", require("./player")());
