[![Build Status](https://www.codeship.io/projects/9274e5a0-341a-0131-92d2-228038a705a1/status)](https://www.codeship.io/projects/9749)

# Hubiquitus

Hubiquitus core system. Actor oriented framework massively distributed.

## Quick start

Create a new folder and run command :

    $ npm install hubiquitus-core

Then create an index.js file and put inside :

```js
var hubiquitus = require('hubiquitus-core');
var logger = hubiquitus.logger('pingpong');
hubiquitus.logger.enable('pingpong');

hubiquitus
  .addActor('hello', function (req) {
    logger.info('Hello World !');
  })
  .start()
  .send('tmp', 'hello');
```
This code does the following :

  1. Imports hubiquitus library
  2. Creates a logger with the namespace "pingpong"
  3. Enables that logger; note that :
    - loggers are disabled by default
    - logger enabling function can take the minimum log level as a second argument
    - log levels are in order : trace, debug, info, warn, error|err
  4. Creates a "hello" actor that just logs "Hello World !"
  5. Starts the hubiquitus container
  6. Sends a message to the hello actor using a "fake" tmp actor id : the hello actor will receive the message from tmp. 

Run the sample with command :

    $ node index.js

The container will run until you stop the node process. You can kill it with CTRL+C.

## Concepts

### Actor

An **actor** is just a piece of code with an id. When a message is sent to this id, the code is executed. Inside an actor code, you have access to

  - `this.id` : the actor id
  - `this.send` : a send function taking four arguments : the target actor id, a content, a timeout (optional) and a response callback (optional)

And actor id (or **aid**) has a specific format : [identifier]/[resource]
The identifier is also called **bare id**.
Examples : `hello/de3ef8f1-28f1-4548-95d2-304b70bd01d9`
  - `hello` is the bare id.
  - `de3ef8f1-28f1-4548-95d2-304b70bd01d9` is the resource

The resource is an **UUID** (unique identifier) generated automatically and added to the bare id of an actor when it is added to a container.

When sending a message, the target can be a full aid, or a bare id. If the target is a bare id, the system will select an existing actor to process the message.

### Container

A **container** is a group of actors. Basically, hubiquitus is a singleton that represents that container. Their is one container by node process.

### Discovery

The **discovery** is the process used so that containers can talk to eachother.

## Ping-pong sample

Let's make a "ping-pong" discussion between two Hubiquitus actors.

```js
var hubiquitus = require('hubiquitus-core');
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
  1. Creates two actors named `ping` and `pong`
  2. Starts the container
  3. Initiates the dialog between `ping` and `pong` by sending a message to `ping`, from `pong`

Now let's have the `ping` actor count messages. To do this, we are going to specify a scope when creating the actor. See the code, it's pretty self-explanatory.

```js
var hubiquitus = require('hubiquitus-core');
var logger = hubiquitus.logger('pingpong');
hubiquitus.logger.enable('pingpong');

hubiquitus
  .addActor('ping', ping, {count: 0})
  .addActor('pong', pong)
  .start()
  .send('pong', 'ping', 'PONG');

function ping(req) {
  this.count++;
  logger.info(this.id + '> from ' + req.from + ' : ' + req.content = ' [' + this.count + ']');

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

### start(options)

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

### stop()

Stops the Hubiquitus container. 

### send(to, from, [content, timeout, cb]  

Sends a message from an actor to another.

Parameters :

|**Parameter**| **Type** |  **Description**  |**Mandatory**|
|:-----------:|:--------:|:-----------------:|:-----------:|
|      to     |  String  |    Receiver aid   |     Yes     |
|     from    |  String  |     Sender aid    |     Yes     |
|   content   |  Object  |  Message content  |      No     |
|     cb      | Function | Response callback |      No     |

Example :

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

### addActor(aid, actorFunction[, scope])

Adds an actor to the container.

Parameters :

|**Parameter**| **Type** |  **Description**  |**Mandatory**|
|:-----------:|:--------:|:-----------------:|:-----------:|
|     aid     |  String  |    Receiver aid   |     Yes     |
|     from    |  String  |     Actor aid     |     Yes     |
|actorFunction| Function |  Definition function  |      Yes     |
|    scope    |  Object  | Actor scope |      No     |

Example :

```js
var hubiquitus = require('hubiquitus-core');

hubiquitus
  .addActor('ping', function (req) {
    this.count++;
    req.reply(null, 'pong');
  }, {count: 0});
  .start();
```

### removeActor(aid)

Removes an actor from the container.

Parameters :

|**Parameter**| **Type** |  **Description**  |**Mandatory**|
|:-----------:|:--------:|:-----------------:|:-----------:|
|     aid     |  String  |     Actor aid     |     Yes     |

### use(middlewareFunction)

Adds a middleware to use.

Parameters :

|   **Parameter**  | **Type** |  **Description**  |**Mandatory**|
|:----------------:|:--------:|:-----------------:|:-----------:|
|middlewareFunction| Function |Middleware function|     Yes     |


The middleware function takes three parameters :

  - `type` : message type
  Is a String, four possibilities :
    - `req_out` : the message is an outcoming request
    - `req_in` : the message is an incoming request
    - `res_out` : the message is an outcoming response
    - `res_in` : the message is an incoming response
  - `message` : transiting message (is a request or a response, depending on the type)
  - `next` : callback to call at the end of the process (to call the next middleware)

Example :

```js
var hubiquitus = require('hubiquitus');

hubiquitus
  .use(function (type, msg, next) {
    switch (type) {
      case 'req_out':
        console.log('[outcoming request from ' + msg.from + ' to ' + msg.to + ' !]');
        break;
      case 'req_in':
        console.log('[incoming request from ' + msg.from + ' to ' + msg.to + '  !]');
        break;
      case 'res_out':
        console.log('[outcoming response from ' + msg.from + ' to ' + msg.to + '  !]');
        break;
      case 'res_in':
        console.log('[incoming response from ' + msg.from + ' to ' + msg.to + '  !]');
        break;
    }
    next();
  })
  .start();
```

### set

Sets an hubiquitus property.

Parameters :

|**Parameter**| **Type** |**Description** |**Mandatory**|
|:-----------:|:--------:|:-----------------:|:-----------:|
|     key     |  String  |  Property key  |     Yes     |
|    value    |     *    | Property value |     Yes     |


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
