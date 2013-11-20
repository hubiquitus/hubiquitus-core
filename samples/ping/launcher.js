/**
 * @module ping sample
 */

var hubiquitus = require(__dirname + "/../../lib/hubiquitus");
var logger = require(__dirname + "/../../lib/logger");

logger.level = "warn";

hubiquitus.start({stats: {enabled: 'true', host: 'localhost', port: 5555}})
  .addActor("ping", require("./player")())
  .addActor("pong", require("./player")())
  .send("ping", "pong", "ping");
