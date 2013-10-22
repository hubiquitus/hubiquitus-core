/**
 * @license
 *
 * Copyright (c) Novedia Group 2012-2013.
 *
 * This file is part of Hubiquitus
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies
 * or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
 * FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * You should have received a copy of the MIT License along with Hubiquitus.
 * If not, see <http://opensource.org/licenses/mit-license.php>.
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
