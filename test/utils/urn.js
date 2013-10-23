require("sinon");
require("mocha");
require("should");
var urn = require(__dirname + "/../../lib/utils/urn");

describe("urn module", function () {

  describe("isValid function", function () {
    it("should validate urn:domain:user/session", function () {
      urn.isValid("urn:domain:user/session").should.eql(true);
    });
    it("shouldn't validate urn:fake", function () {
      urn.isValid("urn:fake").should.eql(false);
    });
  });

  describe("isBare function", function () {
    it("should validate urn:domain:user", function () {
      urn.isBare("urn:domain:user").should.eql(true);
    });
    it("shouldn't validate urn:domain:user/session", function () {
      urn.isBare("urn:domain:user/session").should.eql(false);
    });
  });

  describe("isFull function", function () {
    it("should validate urn:domain:user/session", function () {
      urn.isFull("urn:domain:user/session").should.eql(true);
    });
    it("shouldn't validate urn:domain:user", function () {
      urn.isFull("urn:domain:user").should.eql(false);
    });
  });

  describe("bare function", function () {
    it("should return urn:domain:user", function () {
      urn.bare("urn:domain:user/session").should.eql("urn:domain:user");
    });
  });

  describe("domain function", function () {
    it("should return domain", function () {
      urn.domain("urn:domain:user/session").should.eql("domain");
    });
    it("should return domain", function () {
      urn.domain("urn:domain:user").should.eql("domain");
    });
  });

  describe("user function", function () {
    it("should return user", function () {
      urn.user("urn:domain:user/session").should.eql("user");
    });
    it("should return user", function () {
      urn.user("urn:domain:user").should.eql("user");
    });
  });

  describe("session function", function () {
    it("should return session", function () {
      urn.session("urn:domain:user/session").should.eql("session");
    });
  });

  describe("components function", function () {
    it("should return {domain: domain, user: user, session: session}", function () {
      urn.components("urn:domain:user/session").should.eql({
        domain: "domain",
        user: "user",
        session: "session"
      });
    });
    it("should return {domain: domain, user: user, session: EMPTY_STRING}", function () {
      urn.components("urn:domain:user").should.eql({
        domain: "domain",
        user: "user",
        session: ""
      });
    });
    it("should return {domain: EMPTY_STRING, user: EMPTY_STRING, session: EMPTY_STRING}", function () {
      urn.components("fake_urn").should.eql({
        domain: "",
        user: "",
        session: ""
      });
    });
  });
});
