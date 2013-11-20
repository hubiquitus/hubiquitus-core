var dgram = require('dgram');
var msgpack = require('msgpack');

var socket = dgram.createSocket('udp4');

socket.bind(5555, function () {
  socket.on('message', function (buffer) {
    var message = msgpack.unpack(buffer);
    console.log(message);
  });
});
