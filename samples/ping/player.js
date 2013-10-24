var logger = require(__dirname + "/../../lib/logger");

module.exports = function () {
  var count = 0;

  return function (message) {
    logger.info("[" + this.aid + "] ping from " + message.publisher + " (" + ++count + " total)");
    setTimeout((function () {
      this.send(message.publisher, {payload: "ping"});
    }).bind(this), 500);
  };
};
