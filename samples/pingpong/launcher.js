/**
 * @module pingpong sample
 */

var hubiquitus = require(__dirname + "/../../lib/hubiquitus");
var logger = require(__dirname + "/../../lib/logger");

logger.level = "debug";

hubiquitus.start(function () {
  logger.info("hubiquitus started");
});

hubiquitus
  .addActor("ping", function (message) {
    logger.info(this.aid + "> from " + message.from + " : " + message.content);
    this.send(message.from, "ping");
  })
  .addActor("pong", function (message) {
    logger.info(this.aid + "> from " + message.from + " : " + message.content);
    this.send(message.from, "pong");
  })
  .send("pong", "ping", {payload: "pong"});
