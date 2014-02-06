[![Build Status](https://www.codeship.io/projects/9274e5a0-341a-0131-92d2-228038a705a1/status)](https://www.codeship.io/projects/9749)

# Hubiquitus

Hubiquitus core system. Actor oriented framework massively distributed.

## Quick start

Create a new folder and run command :

    $ npm install hubiquitus-core

Then create an index.js file and put inside :

```js
var hubiquitus = require('hubiquitus');
var logger = hubiquitus.logger('pingpong');
hubiquitus.logger.enable('pingpong');

hubiquitus
  .addActor('hello', function (req) {
    logger.info('Hello World !');
  })
  .start()
  .send('tmp', 'hello');
```
This code does the following

  1. it imports hubiquitus
  2. it creates a logger which namespace is 'pingpong'
  3. it enables that logger; note that
    - loggers are disabled by default
    - loggers enabling can take a second argument which is the minimum log level
    - log levels are trace, debug, info, warn, error|err
  4. it creates an hello actor that just log 'Hello World !'
  5. it starts the container
  6. it sends a message to the hello actor using a "fake" tmp actor id

Run the sample with command :

    $ node index.js

The container is not stopped, so you need to kill the sample with CTRL+C.

## Concepts

### Actor

An **actor** is just a piece of code with an id. When a message is sent to this id, the code is executed. Inside an actor code, you have access to

  - this.id : the actor id
  - this.send : a send function taking four arguments : the target actor id, a content, a timeout (optional) and a response callback (optional)

And actor id composed like this : [identifier]/[resource]

  - example : hello/de3ef8f1-28f1-4548-95d2-304b70bd01d9
  - 'hello' is the bare id.
  - 'hello/de3ef8f1-28f1-4548-95d2-304b70bd01d9' is the full id.

The resource is generated at add. It is an uuid.

If a message is sent to a bare id, a full id will be selected to process the message.

### Container

A **container** is a group of actors. Basically, hubiquitus is a singleton that represents that container. Their is one container by node process.

### Discovery

The **discovery** is the process used so that containers can talk to eachother.

## Ping-pong sample

Let's create a ping pong game based on actors.

```js
var hubiquitus = require('hubiquitus');
var logger = hubiquitus.logger('pingpong');
hubiquitus.logger.enable('pingpong');

hubiquitus
  .addActor('ping', ping)
  .addActor('pong', pong)
  .start()
  .send('pong', 'ping', 'PONG');

function ping(req) {
  logger.info(this.id + '> from ' + req.from + ' : ' + req.content);

  var _this = this;
  setTimeout(function () {
    _this.send(req.from, 'PING');
  }, 1000);
}

function pong(req) {
  logger.info(this.id + '> from ' + req.from + ' : ' + req.content);

  var _this = this;
  setTimeout(function () {
    _this.send(req.from, 'PONG');
  }, 1000);
}
```

This code does the following :
  1. it creates two actors named 'ping' and 'pong'
  2. it starts the container
  3. it initiates the dialog between ping and pong by sending a message to ping as pong

Now let's ping count messages. To do this, we will use the optional scope at actor creation :

```js
var hubiquitus = require('hubiquitus');
var logger = hubiquitus.logger('pingpong');
hubiquitus.logger.enable('pingpong');

hubiquitus
  .addActor('ping', ping, {count: 0})
  .addActor('pong', pong)
  .start()
  .send('pong', 'ping', 'PONG');

function ping(req) {
  this.count++;
  logger.info('[' + this.count + ']' + this.id + '> from ' + req.from + ' : ' + req.content);

  var _this = this;
  setTimeout(function () {
    _this.send(req.from, 'PING');
  }, 1000);
}

function pong(req) {
  logger.info(this.id + '> from ' + req.from + ' : ' + req.content);

  var _this = this;
  setTimeout(function () {
    _this.send(req.from, 'PONG');
  }, 1000);
}
```

## Hubiquitus features

### start

The start method can be called at any time. Messages sent while hubiquitus isnt started are queued.

Parameters :

  - options {Object}

Available options :

  - stats {Object}
  - discoveryAddr {String}
  - discoveryPort {Number}
  - ip {String}

```js
var hubiquitus = require('hubiquitus');
hubiquitus.start({
  discoveryAddr: 'udp://224.0.0.1:5555'
});
```

### stop

Stops hubiquitus.

### send

Sends a message from an actor to another.

Parameters :

  - from {String} sender aid
  - to {String} receiver aid
  - content {Object} message content
  - [timeout] {Number} max delay for a response
  - [cb] {Function} response callback

```js
var hubiquitus = require('hubiquitus');

hubiquitus
  .addActor('Asriel', asriel)
  .addActor('Marisa', marisa)
  .send('Metatron', 'Marisa', 'Greets Asriel for me!')
  .start();

function asriel(req) {
  console.log('Asriel> from ' + hubiquitus.utils.aid.bare(req.from) + ' : ' + req.content);
  req.reply(null, '...');
}

function marisa(req) {
  console.log('Marisa> from ' + hubiquitus.utils.aid.bare(req.from) + ' : ' + req.content);
  this.send('Asriel', 'Hello from Metatron !', function (err, res) {
    console.log('Marisa> response from ' + hubiquitus.utils.aid.bare(res.from) + ' : ' + res.content);
  });
}
```

### addActor

Adds an actor to the container.

Parameters :

  - aid {String} actor id
  - actor {Function} actor feature (function)
  - scope {Object} actor scope (let user use custom scope, default is empty)

```js
var hubiquitus = require('hubiquitus');

hubiquitus
  .addActor('ping', function (req) {
    this.count++;
    req.reply(null, 'pong');
  }, {count: 0});
  .start();
```

### removeActor

Removes an actor from the container.

Parameters :

  - aid {String} actor id

### use

Adds a middleware to use.

Parameters :

  - middleware {Function} middleware feature (function)

The middleware function takes three parameters :

  - **type** : the message type
    - *req_out* : the message is an outcomming request
    - *req_in* : the message is an incomming request
    - *res_out* : the message is an outcomming response
    - *res_in* : the message is an incomming response
  - **message** : the transiting message (a request or a response, depending on the type)
  - **next** : the callback to call at the end of the process (to call next middleware)

```js
var hubiquitus = require('hubiquitus');

hubiquitus
  .use(function (type, msg, next) {
    switch (type) {
      case 'req_out':
        console.log('[outcomming request from ' + msg.from + ' to ' + msg.to + ' !]');
        break;
      case 'req_in':
        console.log('[incomming request from ' + msg.from + ' to ' + msg.to + '  !]');
        break;
      case 'res_out':
        console.log('[outcomming response from ' + msg.from + ' to ' + msg.to + '  !]');
        break;
      case 'res_in':
        console.log('[incomming response from ' + msg.from + ' to ' + msg.to + '  !]');
        break;
    }
    next();
  })
  .start();
```

### set

Sets an hubiquitus property.

Parameters :

  - key {String} property key
  - value {*} property value

## Samples

Samples list :

  - **pingpong** : simple actor based ping-pong
  - **ping** : ping between two "instances" of the same actor
  - **ping-cs** : coffeescript version of ping
  - **ping-remote** : ping between two foreign actors (two different containers)
  - **request-reply** : simple request-reply sample
  - **middlewares** : middlewares demo

## Docs

Under heavy developments.
The whole documentation of the Hubiquitus project is available in the `docs` subdirectory of this repo.

## License

Hubiquitus is a free and open source software licensed under the terms of the [MIT license](http://opensource.org/licenses/MIT).

This document itself, as the whole documentation provided with the project, is licensed under the terms of the Creative Commons Attribution Unported 3.0 ([CC BY 3.0](http://creativecommons.org/licenses/by/3.0/)).
