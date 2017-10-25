/**
 * @module hubiquitus core library
 */

var app = require('./lib/application');
app.logger = require('./lib/logger');
app.monitoring = require('./lib/monitoring');
app.properties = require('./lib/properties');
app.utils = {
  aid: require('./lib/utils/aid'),
  ip: require('./lib/utils/ip'),
  uuid: require('./lib/utils/uuid')
};
module.exports = app;

process.on('SIGUSR2', function() {
  console.log(new  Date());
  console.log(JSON.stringify(app.debugActors(), null, 2));
});
