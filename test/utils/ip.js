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

var sinon = require("sinon");
var mocha = require("mocha");
var should = require("should");
var os = require("os");
var ip = require(__dirname + "/../../lib/utils/ip");

describe("ip module", function () {
  var stubNetworkInterfaces;

  before(function () {
    stubNetworkInterfaces = sinon.stub(os, "networkInterfaces", function () {
      return {
        lo: [
          {address: '127.0.0.1', family: 'IPv4', internal: true},
          {address: '::1',       family: 'IPv6', internal: true}
        ],
        eth0: [
          {address: '4.4.4.4', family: 'IPv4', internal: false},
          {address: 'fe80::5054:ff:fe28:ca53', family: 'IPv6', internal: false}
        ],
        eth1: [
          {address: '8.8.8.8', family: 'IPv4', internal: false},
          {address: 'fe80::5054:ff:fe18:5258', family: 'IPv6', internal: false}
        ]
      };
    });
  });

  after(function () {
    stubNetworkInterfaces.restore();
  });

  describe("resolve function", function () {
    it("should return 4.4.4.4", function () {
      ip.resolve().should.be.equal("4.4.4.4");
    });
  });
});
