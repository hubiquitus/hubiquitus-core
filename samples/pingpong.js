/**
 * @module pingpong sample
 */

var hubiquitus = require(__dirname + "/../lib/hubiquitus");
var logger = require(__dirname + "/../lib/logger");

hubiquitus
  .addActor("ping", function (message) {
    logger.info(this.id + "> from " + message.publisher + " : " + message.payload);
    setTimeout((function () {
      this.send("pong", {payload: "ping"});
    }).bind(this), 500);
  })
  .addActor("pong", function (message) {
    logger.info(this.id + "> from " + message.publisher + " : " + message.payload);
    setTimeout((function () {
      this.send("ping", {payload: "pong"});
    }).bind(this), 500);
  })
  .send("pong", "ping", {payload: "pong"});
