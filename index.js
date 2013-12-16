/**
 * @module hubiquitus core library
 */

var app = require('./lib/application');
app.logger = require('./lib/logger');
app.utils = {
  aid: require('./lib/utils/aid'),
  ip: require('./lib/utils/ip'),
  uuid: require('./lib/utils/uuid')
};
module.exports = app;
