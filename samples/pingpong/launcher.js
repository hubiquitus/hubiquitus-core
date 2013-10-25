/**
 * @module pingpong sample
 */

var hubiquitus = require(__dirname + "/../../lib/hubiquitus");
var logger = require(__dirname + "/../../lib/logger");

logger.level = "debug";

hubiquitus
  .addActor("ping", function (message) {
    logger.info(this.aid + "> from " + message.publisher + " : " + message.payload);
    this.send(message.publisher, {payload: "ping"});
  })
  .addActor("pong", function (message) {
    logger.info(this.aid + "> from " + message.publisher + " : " + message.payload);
    this.send(message.publisher, {payload: "pong"});
  })
  .start()
  .send("pong", "ping", {payload: "pong"});
