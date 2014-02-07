var hubiquitus = require(__dirname + '/../../index');
hubiquitus.logger.enable('hubiquitus:*', 'warn');

hubiquitus.start({discoveryAddr: 'udp://224.0.0.1:5555'})
  .addActor('fibonacci', require('./fibonacci')());
