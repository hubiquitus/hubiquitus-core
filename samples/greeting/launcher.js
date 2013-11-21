/**
 * @module ping-cb sample
 */

var hubiquitus = require(__dirname + '/../../lib/hubiquitus');
var logger = require(__dirname + '/../../lib/logger');

logger.level = 'trace';

hubiquitus.start()
  .addActor('joe', function (from, content, reply) {
    logger.info(this.id + '> from ' + from + ' : ' + content);
    setTimeout(function () {
      reply(null, 'hi');
    }, 0);
  })
  .addActor('max', function (from, content, reply) {
    logger.info(this.id + '> from ' + from + ' : ' + content);
    this.send('joe', 'hello', 1000, function (err, content) {
      if (err) return logger.err(err);
      logger.info(this.id + '> from ' + from + ' : ' + content);
    }.bind(this));
  })
  .send('god', 'max', 'greets joe !');
