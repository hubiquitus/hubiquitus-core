/**
 * @module ping-ipc launcher 1
 */

var hubiquitus = require(__dirname + "/../../lib/hubiquitus");
var logger = require(__dirname + "/../../lib/logger");

logger.level = "debug";

hubiquitus.start({discoveryAddr: "epgm://224.0.0.1:5555"})
  .addActor("ping", require("./player")());
