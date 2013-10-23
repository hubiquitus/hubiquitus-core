require("sinon");
require("mocha");
require("should");
var os = require("os");
var ip = require(__dirname + "/../../lib/utils/ip");

describe("ip module", function () {
  var stubNetworkInterfaces;

  before(function () {
    stubNetworkInterfaces = sinon.stub(os, "networkInterfaces", function () {
      return {
        lo: [
          {address: "127.0.0.1", family: "IPv4", internal: true},
          {address: "::1",       family: "IPv6", internal: true}
        ],
        eth0: [
          {address: "4.4.4.4", family: "IPv4", internal: false},
          {address: "fe80::5054:ff:fe28:ca53", family: "IPv6", internal: false}
        ],
        eth1: [
          {address: "8.8.8.8", family: "IPv4", internal: false},
          {address: "fe80::5054:ff:fe18:5258", family: "IPv6", internal: false}
        ]
      };
    });
  });

  after(function () {
    stubNetworkInterfaces.restore();
  });

  describe("resolve function", function () {
    it("should return 4.4.4.4", function () {
      ip.resolve().should.eql("4.4.4.4");
    });
  });
});
