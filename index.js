/**
 * @module hubiquitus library
 */

var hubiquitus = require("./lib/hubiquitus");
hubiquitus.filter = require("./lib/filter");
hubiquitus.logger = require("./lib/logger");
hubiquitus.utils = {
  aid: require("./lib/utils/aid"),
  ip: require("./lib/utils/ip"),
  uuid: require("./lib/utils/uuid")
};
module.exports = hubiquitus;
