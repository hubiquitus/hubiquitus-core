var app = require(__dirname + '/../../lib/application.js');

app
  .addActor('remote_sample', sample)
  .start({discoveryAddr: 'udp://224.0.0.1:5555'});

function sample(req) {
  req.reply(null, 'hi from ' + process.pid);
}
