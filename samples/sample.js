var hubiquitus = require(__dirname + "/../lib/hubiquitus");
var logger = require(__dirname + "/../lib/logger");

hubiquitus
  .addActor("ping", function (message) {
    logger.info(message.actor + " : from " + message.publisher + " : " + message.payload);
    this.send("pong", {payload: "ping"});
  })
  .addActor("pong", function (message) {
    logger.info(message.actor + " : from " + message.publisher + " : " + message.payload);
    this.send("ping", {payload: "pong"});
  })
  .send("pong", "ping", {payload: "pong"});
