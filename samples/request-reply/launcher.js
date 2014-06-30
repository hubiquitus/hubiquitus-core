/**
 * @module request-reply sample
 * Steve and Bill (actor) in same container (also available over remotes containers)
 * using the request/reply pattern to answer each other.
 * We start the container and add both actors.
 * Linus ask kindly Steve to borrow his iWings to Bill.
 * Bill has 1s to answer Steve before Steve thinks he is dead.
 * Start function can be called at anytime : messages are queued until the container starts.
 */

var hubiquitus = require(__dirname + '/../../index');
hubiquitus.logger.enable('hubiquitus:core:samples', 'trace');
var logger = hubiquitus.logger('hubiquitus:core:samples');

hubiquitus.start()
  .set('name', 'request-reply sample')
  .addActor('steve', steve)
  .addActor('bill', bill)
  .send('linus', 'steve', 'Bill might need your iWings :) !');

function steve(req) {
  logger.info(req.to + '> from ' + req.from + ' : ' + req.content);
  hubiquitus.send(req.to, 'bill', 'hi, Bill would like to try my iWings !', 1000, function (err, res) {
    if (err) return logger.err(err);
    logger.info(req.to + '> from ' + res.from + ' : ' + res.content);
    hubiquitus.stop();
  }.bind(this));
}

function bill(req) {
  logger.info(req.to + '> from ' + req.from + ' : ' + req.content);
  req.reply(null, 'Yes thanks Steve, you\'re great man. !');
}
