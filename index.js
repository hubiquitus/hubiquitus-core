/**
 * @module hubiquitus core library
 */

var app = require('./lib/application');
app.logger = require('./lib/logger');
app.monitoring = require('./lib/monitoring');
app.properties = require('./lib/properties');
app.utils = {
  ip: require('./lib/utils/ip'),
  uuid: require('./lib/utils/uuid')
};
module.exports = app;
