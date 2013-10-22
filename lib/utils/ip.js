/**
 * @module ip
 * Provides ip resolution
 */

var os = require("os");
var _ = require("lodash");

var ifaceTypes = ["eth", "en", "wlan", "vmnet", "ppp", "lo"];

/**
 * Parses a network interface name
 * @param ifaceName {string} interface name
 * @returns {object} iface type and index
 */
var parseIfaceName = function (ifaceName) {
  var ifaceNameComponents = ifaceName.match(/^([^0-9]+)([0-9]*)$/);
  if (!ifaceNameComponents) return {};
  return {
    type: ifaceNameComponents[1],
    idx: ifaceNameComponents[2] || 0
  };
};

/**
 * Sorts interfaces names by priority (eth, en, wlan, vmnet, ppp, lo)
 * @param ifacesNames {array} interfaces names
 * @returns {array} sorted interfaces names
 */
var sortIfacesNames = function (ifacesNames) {
  return ifacesNames.sort(function (iface1, iface2) {
    iface1 = parseIfaceName(iface1);
    iface2 = parseIfaceName(iface2);
    if (iface1.type === iface2.type) {
      return (iface1.idx > iface2.idx) ? 1 : -1;
    } else {
      return (ifaceTypes.indexOf(iface1.type) > ifaceTypes.indexOf(iface2.type) ? 1 : -1);
    }
  });
};

/**
 * Resolves the IP address
 * @returns {string} ip address
 */
exports.resolve = function () {
  var ifaces = os.networkInterfaces();
  var res = null;
  if (ifaces) {
    var ifacesNames = sortIfacesNames(_.keys(ifaces));
    _.forEach(ifacesNames, function (ifaceName) {
      if (!res) {
        var iface = ifaces[ifaceName];
        _.forEach(iface, function (item) {
          if (!res && item["family"] === "IPv4") {
            res = item["address"];
          }
        });
      }
    });
  }
  return res || "127.0.0.1";
};
