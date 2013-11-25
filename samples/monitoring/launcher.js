var dgram = require('dgram');
var http = require('http');
var static = require('node-static');
var sockjs = require('sockjs');

var socket = dgram.createSocket('udp4');
socket.bind(5555, function () {
  socket.on('message', function (buffer) {
    broadcast(buffer);
  });
});

var clients = [];
var ws = sockjs.createServer();
ws.on('connection', function (connection) {
  clients[connection.id] = connection;
  connection.on('close', function () {
    delete clients[connection.id];
  });
});
function broadcast(data) {
  for (var id in clients) {
    if (clients.hasOwnProperty(id)) {
      clients[id].write(data);
    }
  }
}

var file = new static.Server('.');
var httpServer = http.createServer(function (request, response) {
  request.addListener('end', function () {
    file.serveFile('/index.html', 200, {}, request, response);
  }).resume();
});
ws.installHandlers(httpServer, {prefix: '/stats'});
httpServer.listen(5556, '0.0.0.0');
