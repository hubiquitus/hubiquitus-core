var sinon = require("sinon");
var mocha = require("mocha");
var should = require("should");
var aid = require(__dirname + "/../../lib/utils/aid");

describe("aid module", function () {

  describe("isValid function", function () {
    it("should validate aid/session", function () {
      aid.isValid("aid/session").should.eql(true);
    });
    it("shouldn't validate null", function () {
      aid.isValid(null).should.eql(false);
    });
  });

  describe("isBare function", function () {
    it("should validate aid", function () {
      aid.isBare("aid").should.eql(true);
    });
    it("shouldn't validate aid/session", function () {
      aid.isBare("aid/session").should.eql(false);
    });
  });

  describe("isFull function", function () {
    it("should validate aid/session", function () {
      aid.isFull("aid/session").should.eql(true);
    });
    it("shouldn't validate aid", function () {
      aid.isFull("aid").should.eql(false);
    });
  });

  describe("bare function", function () {
    it("should return aid", function () {
      aid.bare("aid/session").should.eql("aid");
    });
  });

  describe("session function", function () {
    it("should return session", function () {
      aid.session("aid/session").should.eql("session");
    });
  });

  describe("components function", function () {
    it("should return {bare: bare, session: session}", function () {
      aid.components("aid/session").should.eql({
        bare: "aid",
        session: "session"
      });
    });
    it("should return {bare: bare, session: EMPTY_STRING}", function () {
      aid.components("aid").should.eql({
        bare: "aid",
        session: ""
      });
    });
  });
});
