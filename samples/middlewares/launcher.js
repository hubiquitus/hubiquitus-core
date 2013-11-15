/**
 * @module middleware sample
 */

var hubiquitus = require(__dirname + "/../../lib/hubiquitus");
var logger = require(__dirname + "/../../lib/logger");
logger.level = "warn";
var utils = {
  aid: require(__dirname + "/../../lib/utils/aid")
};

hubiquitus.start()
  .addActor("toto", function (from, content, reply) {
    console.log(this.id + "> from " + from + " : " + content);
    console.log("\nREPLYING 'hi'");
    reply(null, "hi !");
  });

console.log("[m1] no filter");
hubiquitus.use(function (message, type, cb) {
  console.log("[m1] invoked; " + type);
  cb();
});

console.log("[m2] allow only content 'hello'");
hubiquitus.use(function (message, type, cb) {
  console.log("[m2] invoked; " + type);
  if (message.payload.content !== 'hello') {
    console.log("[m2] content !== 'hello', REJECTED");
  } else {
    cb();
  }
});

console.log("\nSENDING 'hello'");
hubiquitus.send("god", "toto", "hello");
