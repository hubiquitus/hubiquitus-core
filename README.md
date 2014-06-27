[![Build Status](https://www.codeship.io/projects/9274e5a0-341a-0131-92d2-228038a705a1/status?branch=master)](https://www.codeship.io/projects/9749)

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
    - log levels are, in order : trace, debug, info, warn, error|err
  4. Creates a "hello" actor that just logs "Hello World !"
  5. Starts the hubiquitus system
  6. Sends a message to the hello actor using a "fake" tmp actor id : the hello actor will receive the message from tmp.

Run the sample with command :

    $ node index.js

The container will run until you stop the node process. You can kill it with CTRL+C.

## Concepts

### Actor

An **actor** is just a piece of code with an id. When a message is sent to this id, the code is executed. Inside an actor code, you have access to :

  - `this.id` is the actor id
  - `this.send` is a send function taking four arguments : the target actor id, a content, a timeout (optional) and a response callback (optional)

And actor id (or **aid**) has a specific format : **[identifier]/[resource]**

The identifier is also called **bare id**.

Example : `hello/de3ef8f1-28f1-4548-95d2-304b70bd01d9` is a full aid
  - `hello` is the bare id.
  - `de3ef8f1-28f1-4548-95d2-304b70bd01d9` is the resource

The resource is an **UUID** (unique identifier) generated automatically and added to the bare id of an actor when it is added to a container.

When sending a message, the target can be a full aid, or a bare id. If the target is a bare id, the system will select an existing actor with a matching full id to process the message to.

### Container

A **container** is a group of actors. Hubiquitus is a singleton obtained when requiring the hubiquitus-core module.
Thus, there can be only one container in a node process.

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

Note that when specifying a scope, `id`, `send`, `onMessage` and `scope` are reserved by the system.

## Hubiquitus API

Here are the available methods on the Hubiquitus container.

### start(options)

The start method can be called at any time. Messages sent while hubiquitus isnt started are queued.

Parameters :

|**Parameter**| **Type** |**Description**|**Mandatory**|
|:-----------:|:--------:|:-------------:|:-----------:|
|    options  |  Object  |    Options    |      No     |

Available options :

  - discoveryAddr {String}
  - discoveryPort {Number}
  - ip {String}

Example :

```js
var hubiquitus = require('hubiquitus-core');
hubiquitus.start({
  discoveryAddr: 'udp://224.0.0.1:5555'
});
```

### stop()

Stops the Hubiquitus container.

### addActor(aid, onMessage[, scope])

Adds an actor to the container.

Parameters :

|**Parameter**| **Type** |    **Description**    |**Mandatory**|
|:-----------:|:--------:|:---------------------:|:-----------:|
|     aid     |  String  |      Receiver aid     |     Yes     |
|     from    |  String  |       Actor aid       |     Yes     |
|  onMessage  | Function |  on message behaviour |     Yes     |
|    scope    |  Object  |      Actor scope      |     No      |

The `onMessage` function is the behaviour executed when receiving a message.
It takes a `req` Object as an unique parameter :
  - `from` {String} is the sender aid
  - `to` {String} is the receiver aid
  - `content` {*} is the content of the message
  - `timeout` {Number} is the maximum delay for delivering the message
  - `date` {Date} is the send date of the message
  - `reply` {Function} is a function to call to reply to the message

  The `reply` function takes two arguments :
   - `err` {*} is the optional error
   - `content` {*} is the response content

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

### send(from, to, [content, timeout, cb])

Sends a message from an actor to another.

Parameters :

|**Parameter**| **Type** |  **Description**  |**Mandatory**|
|:-----------:|:--------:|:-----------------:|:-----------:|
|     from    |  String  |     Sender aid    |     Yes     |
|      to     |  String  |    Receiver aid   |     Yes     |
|   content   |  Object  |  Message content  |      No     |
|     cb      | Function | Response callback |      No     |

The `cb` function is the behaviour executed when receiving the message response :
It takes a two arguments :
  - `err` {*} is the optional error
  - `res` {Object} is the response message.

  A `res` message is similar to a `req` message. It contains :
   - `from` {String} is the sender aid
   - `to` {String} is the receiver aid
   - `content` {*} is the content of the message
   - `timeout` {Number} is the maximum delay for delivering the message
   - `date` {Date} is the send date of the message

This function also exists within an actor with the following syntax :

   **send(to, [content, timeout, cb])**

Example :

```js
var hubiquitus = require('hubiquitus-core');

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

  - A "fake" `Metatron` actor sends a message to `Marisa`
  - `Marisa` sends a message to `Asriel`
  - `Asriel` replies to `Marisa`

### use(function)

Adds a middleware to use.
The defined function will be executed each time an incoming request comes in or an outcoming request comes out.

Parameters :

|**Parameter**| **Type** |  **Description**  |**Mandatory**|
|:-----------:|:--------:|:-----------------:|:-----------:|
|   function  | Function |Middleware function|     Yes     |


The middleware function takes three parameters :

  - `type` : message type. Is a String, four possibilities :
   - `req_out` : the message is an outcoming request
   - `req_in` : the message is an incoming request
   - `res_out` : the message is an outcoming response
   - `res_in` : the message is an incoming response

  - `msg` : transiting message (is a request or a response, depending on the type)
  - `next` : callback to call at the end of the process (to call the next middleware)

Example :

```js
var hubiquitus = require('hubiquitus-core');
hubiquitus
  .addActor('B', function (req) {
    logger.info('Hello World !');
  })
  .start()
  .use(function (type, msg, next) {
    var fromAid = hubiquitus.utils.aid.bare(msg.from);
    var toAid = hubiquitus.utils.aid.bare(msg.to);
    switch (type) {
      case 'req_out':
        console.log('[outcoming request from ' + fromAid + ' to ' + toAid + ' !]');
        break;
      case 'req_in':
        console.log('[incoming request from ' + fromAid + ' to ' + toAid + ' !]');
        break;
      case 'res_out':
        console.log('[outcoming response from ' + fromAid + ' to ' + toAid + ' !]');
        break;
      case 'res_in':
        console.log('[incoming response from ' + fromAid + ' to ' + toAid + ' !]');
        break;
    }
    next();
  })
  .send('A', 'B');
```

In the above example, an `A` actor sends a message to a `B` actor inside the same container. The middleware function is executed twice and displays :
```
[outcoming request from A to B !]
[incoming request from A to B !]
```
Note that you can start using a middleware after the hubiquitus container has started.

### set(key, value)

Sets a hubiquitus property.

Parameters :

|**Parameter**| **Type** |**Description** |**Mandatory**|
|:-----------:|:--------:|:--------------:|:-----------:|
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
