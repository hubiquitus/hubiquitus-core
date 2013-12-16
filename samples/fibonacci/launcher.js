var hubiquitus = require(__dirname + '/../../index');
hubiquitus.logger.enable('hubiquitus:*', 'warn');

hubiquitus.start({stats: {enabled: 'true', host: 'localhost', port: 5555}, discoveryAddr: 'udp://224.0.0.1:5555'})
  .addActor('fibonacci', require('./fibonacci')());
