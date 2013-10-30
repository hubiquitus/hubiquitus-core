require("mocha");
var should = require("should");
var actors = require(__dirname + "/../lib/actors");
var h = require(__dirname + "/../lib/hubiquitus");
var _ = require("lodash");

describe("actors module", function () {
  var originalHID = h.ID;
  var originalNetInfo = h.netInfo;

  var testActors = {
    ping: {id: "ping", container: {id: "0", netInfo: {pid: 0, ip: "0.0.0.0"}}},
    pong: {id: "pong", container: {id: "0", netInfo: {pid: 0, ip: "0.0.0.0"}}},
    pung: {id: "pung", container: {id: "2", netInfo: {pid: 1, ip: "0.0.0.0"}}},
    peng: {id: "peng", container: {id: "3", netInfo: {pid: 3, ip: "1.1.1.1"}}},
    pang: {id: "pang", container: {id: "3", netInfo: {pid: 3, ip: "1.1.1.1"}}},
    fping1: {id: "fping/1", container: {id: "0", netInfo: {pid: 0, ip: "0.0.0.0"}}},
    fping2: {id: "fping/2", container: {id: "0", netInfo: {pid: 0, ip: "0.0.0.0"}}}
  };
  var testActorsCount = _.keys(testActors).length;

  before(function () {
    h.ID = 0;
    h.netInfo = {pid: 0, ip: "0.0.0.0"};
  });

  after(function () {
    h.ID = originalHID;
    h.netInfo = originalNetInfo;
  });

  beforeEach(function () {
    _.forOwn(testActors, function (actor) {
      actors.add(actor);
    });
  });

  afterEach(function () {
    actors.removeAll();
  });

  describe("count function", function () {
    it("should return valid count", function () {
      actors.count().should.be.eql(testActorsCount);
    });
  });

  describe("add function", function () {
    it("should add an actor", function () {
      actors.add({id: "tmp"});
      actors.count().should.be.eql(testActorsCount + 1);
    });
  });

  describe("remove function", function () {
    it("should remove an actor", function () {
      actors.remove("ping");
      actors.count().should.be.eql(testActorsCount - 1);
    });
  });

  describe("removeAll function", function () {
    it("should remove all actors", function () {
      actors.removeAll();
      actors.count().should.be.eql(0);
    });
  });

  describe("exists function", function () {
    it("should return true", function () {
      actors.exists("ping").should.be.eql(true);
    });
    it("should return false", function () {
      actors.exists("fake").should.be.eql(false);
    });
  });

  describe("get function", function () {
    it("should return ping actor", function () {
      actors.get("ping").should.be.eql(testActors.ping);
    });
    it("should return null", function () {
      should.not.exist(actors.get("fake"));
    });
    it("should return ping actor (force scope : process)", function () {
      actors.get("ping", actors.scope.PROCESS).should.be.eql(testActors.ping);
    });
    it("should return pung actor (force scope : local)", function () {
      actors.get("pung", actors.scope.LOCAL).should.be.eql(testActors.pung);
    });
    it("should return peng actor (force scope : remote)", function () {
      actors.get("peng", actors.scope.REMOTE).should.be.eql(testActors.peng);
    });
  });

  describe("getScope function", function () {
    it("should return process", function () {
      actors.getScope("ping").should.be.eql(actors.scope.PROCESS);
    });
    it("should return local", function () {
      actors.getScope("pung").should.be.eql(actors.scope.LOCAL);
    });
    it("should return remote", function () {
      actors.getScope("peng").should.be.eql(actors.scope.REMOTE);
    });
    it("should return none", function () {
      actors.getScope("fake").should.be.eql(actors.scope.NONE);
    });
  });

  describe("pick function", function () {
    it("should return ping", function () {
      actors.pick("ping").should.be.eql("ping");
    });
    it("should return one element", function () {
      var aid = actors.pick("fping");
      should.exist(aid);
      aid.should.have.type("string");
    });
  });

  describe("pickAll function", function () {
    it("should return ping", function () {
      var aids = actors.pickAll("fping/1");
      should.exist(aids);
      aids.should.be.an.instanceof(Array);
      aids.should.have.length(1);
      aids[0].should.be.eql("fping/1");
    });
    it("should return one element", function () {
      var aids = actors.pickAll("fping");
      should.exist(aids);
      aids.should.be.an.instanceof(Array);
      aids.should.have.length(2);
    });
    it("should return one element", function () {
      var aids = actors.pickAll("fping", actors.scope.REMOTE);
      should.exist(aids);
      aids.should.be.an.instanceof(Array);
      aids.should.have.length(0);
    });
  });
});
