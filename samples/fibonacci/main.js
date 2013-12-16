var os = require('os');
var proc = require('child_process');
var hubiquitus = require(__dirname + '/../../index');

os.cpus().forEach(function () {
  proc.fork(__dirname + '/launcher');
});

hubiquitus.start({discoveryAddr: 'udp://224.0.0.1:5555'})
  .send('anonymous', 'test', 'start')
  .addActor('test', function () {
    setTimeout(function () {
      var n = 20;
      this.send('fibonacci', n, 300000, function (req) {
        console.log('Result :', 'ƒ ' + n + ' = ' + req.content);
      });
    }.bind(this), 1000);
  });
