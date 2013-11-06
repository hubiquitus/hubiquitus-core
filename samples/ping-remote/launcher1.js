/**
 * @module ping-ipc launcher 1
 */

var hubiquitus = require(__dirname + "/../../lib/hubiquitus");
var logger = require(__dirname + "/../../lib/logger");

logger.level = "info";

//hubiquitus.set("discoveryAddrs", ["udp://192.168.0.50:4445"]);
//hubiquitus.start({discoveryPort: 4444})
hubiquitus.start({discoveryAddr: "udp://224.0.0.1:5555"})
  .addActor("ping", require("./player")());


