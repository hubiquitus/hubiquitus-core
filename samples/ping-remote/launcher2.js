/**
 * @module ping-ipc launcher 2
 */

var hubiquitus = require(__dirname + "/../../lib/hubiquitus");
var logger = require(__dirname + "/../../lib/logger");

logger.level = "info";

hubiquitus.set("discoveryAddrs", ["udp://192.168.0.50:4444"]);
hubiquitus.start({discoveryAddr: "udp://224.0.0.1:5555"})
//hubiquitus.start({discoveryPort: 4445})
  .addActor("pong", require("./player")())
  .send("pong", "ping", "ping");

