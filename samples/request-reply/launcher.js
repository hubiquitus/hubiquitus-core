/**
 * @module request-reply sample
 * Steve and Bill (actor) in same container (also available over remotes containers)
 * using the request/reply pattern to answer each other.
 * We start the container and add both actors.
 * Linus ask kindly Steve to borrow his iWings to Bill.
 * Bill has 1s to answer Steve before Steve thinks he is dead.
 * Start function can be called at anytime : messages are queued until the container starts.
 */

var hubiquitus = require(__dirname + '/../../lib/hubiquitus');
var logger = require(__dirname + '/../../lib/logger');

logger.level = 'info';

hubiquitus.start()
  .addActor('steve', steve)
  .addActor('bill', bill)
  .send('linus', 'steve', 'Bill might need your iWings :) !');

function steve(from, content, reply) {
  logger.info(this.id + '> from ' + from + ' : ' + content);
  this.send('bill', 'hi, Bill would like to try my iWings !', 1000, function (err, content) {
    if (err) return logger.err(err);
    logger.info(this.id + '> from ' + from + ' : ' + content);
  }.bind(this));
}

function bill(from, content, reply) {
  logger.info(this.id + '> from ' + from + ' : ' + content);
  reply(null, 'Yes thanks Steve, you\'re great man. !');
}
