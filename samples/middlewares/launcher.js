/**
 * @module middleware sample
 * This sample shows how to use middlewares.
 * Middlewares are called everytime a message go in or out (even for reponses).
 * Middlewares are called in the order they are defined.
 * They can be used to filter, secure or log exchanges between actors or enhance messages.
 * Middlewares are defined at container level.
 *
 * We define here two middlewares :
 *  - Middleware 1 doesn't do anything.
 *  - Middleware 2 only allows hello messages.
 */

var hubiquitus = require(__dirname + '/../../index');
var logger = hubiquitus.logger('hubiquitus:core:samples');
hubiquitus.logger.enable('hubiquitus:core:samples', 'debug');

hubiquitus.use(middleware1);
hubiquitus.use(middleware2);

hubiquitus.start()
  .addActor('linus', linus)
  .send('god', 'linus', 'hello');

function linus(req) {
  logger.info(req.to + '> from ' + req.from + ' : ' + req.content);
  req.reply(null, 'hi !');
}

function middleware1(type, msg, next) {
  logger.info('[m1] invoked (' + type + ')', msg);
  next();
}

function middleware2(type, msg, next) {
  logger.info('[m2] invoked; (' + type + ')', msg);
  if (msg.content !== 'hello') {
    logger.info('[m2] content different from "hello" : REJECTED');
  } else {
    next();
  }
}
