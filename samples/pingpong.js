/**
 * @module pingpong sample
 */

var hubiquitus = require(__dirname + "/../lib/hubiquitus");
var logger = require(__dirname + "/../lib/logger");

logger.level = "debug";

hubiquitus
  .addActor("ping", function (message) {
    logger.info(this.id + "> from " + message.publisher + " : " + message.payload);
    setTimeout((function () {
      this.send(message.publisher, {payload: "ping"});
    }).bind(this), 500);
  })
  .addActor("pong", function (message) {
    logger.info(this.id + "> from " + message.publisher + " : " + message.payload);
    setTimeout((function () {
      this.send(message.publisher, {payload: "pong"});
    }).bind(this), 500);
  })
  .send("pong", "ping", {payload: "pong"});
