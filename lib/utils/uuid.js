/**
 * @module uuid
 * UUID v4 generator in JavaScript (RFC4122 compliant).
 * Source : https://gist.github.com/jcxplorer/823878
 */
var uuid = require('node-uuid');

module.exports = function () {
  return uuid.v4();
};
