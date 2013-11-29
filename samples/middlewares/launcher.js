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
logger.level = 'info';

hubiquitus.use(middleware1);
hubiquitus.use(middleware2);

hubiquitus.start()
  .addActor('linus', linus)
  .send('god', 'linus', 'hello');

function linus(from, content, reply) {
  logger.info(this.id + '> from ' + from + ' : ' + content);
  reply(null, 'hi !');
}

function middleware1(message, type, next) {
  logger.info('[m1] invoked (' + type + ')', message);
  next();
}

function middleware2(message, type, next) {
  logger.info('[m2] invoked; (' + type + ')', message);
  if (message.payload.content !== 'hello') {
    logger.info('[m2] content different from "hello" : REJECTED');
  } else {
    next();
  }
}
