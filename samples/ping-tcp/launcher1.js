/**
 * @module ping-ipc launcher 1
 */

var hubiquitus = require(__dirname + "/../../lib/hubiquitus");
var logger = require(__dirname + "/../../lib/logger");
var utils = {
  ip: require(__dirname + "/../../lib/utils/ip")
};

logger.level = "debug";

hubiquitus.start({discoveryAddr: "epgm://" + utils.ip.resolve() + ";224.0.0.1:5555"})
  .addActor("ping", require("./player")());
