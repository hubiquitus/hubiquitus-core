require('mocha');
var should = require('should');
var _ = require('lodash');

var actors = require(__dirname + '/../lib/actors');
var properties = require(__dirname + '/../lib/properties');
var utils = {
  aid: require(__dirname + '/../lib/utils/aid')
};

describe('actors module', function () {
  var originalID = properties.ID;
  var originalNetInfo = properties.netInfo;

  var testActors = {
    ping: {id: 'ping', container: {id: '0', netInfo: {pid: 0, ip: '0.0.0.0'}}},
    pong: {id: 'pong', container: {id: '1', netInfo: {pid: 1, ip: '0.0.0.0'}}},
    peng: {id: 'peng', container: {id: '2', netInfo: {pid: 3, ip: '1.1.1.1'}}},
    pang: {id: 'pang', container: {id: '2', netInfo: {pid: 3, ip: '1.1.1.1'}}},
    fping1: {id: 'fping/1', container: {id: '0', netInfo: {pid: 0, ip: '0.0.0.0'}}},
    fping2: {id: 'fping/2', container: {id: '0', netInfo: {pid: 0, ip: '0.0.0.0'}}},
    fping4: {id: 'fping/3', container: {id: '2', netInfo: {pid: 3, ip: '1.1.1.1'}}}
  };

  before(function () {
    properties.ID = 0;
    properties.netInfo = {pid: 0, ip: '0.0.0.0'};
  });

  after(function () {
    properties.ID = originalID;
    properties.netInfo = originalNetInfo;
  });

  beforeEach(function () {
    _.forOwn(testActors, function (actor) {
      actors.add(actor);
    });
  });

  afterEach(function () {
    _.forOwn(testActors, function (actor) {
      actors.remove(actor);
    });
  });

  describe('getAll function', function () {
    it('should return [fping/1]', function () {
      var aids = actors.getAll('fping/1');
      should.exist(aids);
      aids.should.be.an.instanceof(Array);
      aids.should.have.length(1);
      aids[0].should.be.eql('fping/1');
    });
    it('should return [fping/1, fping/2, fping/3]', function () {
      var aids = actors.getAll('fping');
      should.exist(aids);
      aids.should.be.an.instanceof(Array);
      aids.should.have.length(3);
    });
    it('should return [fping/3]', function () {
      var aids = actors.getAll('fping', actors.scope.REMOTE);
      should.exist(aids);
      aids.should.be.an.instanceof(Array);
      aids.should.have.length(1);
      aids[0].should.be.eql('fping/3');
    });
    it('should return []', function () {
      var aids = actors.getAll('fake');
      should.exist(aids);
      aids.should.be.an.instanceof(Array);
      aids.should.be.empty;
    });
  });

  describe('get function', function () {
    it('should return ping actor', function () {
      var aids = actors.getAll('ping');
      aids.should.have.length(1);
      var actor = actors.get(aids[0]);
      actor.should.be.eql(testActors.ping);
      actor.scope.should.be.eql(actors.scope.PROCESS);
    });
    it('should return null', function () {
      var actor = actors.get('fake');
      should.not.exist(actor);
    });
    it('should return ping actor (force scope : process)', function () {
      var aids = actors.getAll('ping');
      aids.should.have.length(1);
      var actor = actors.get(aids[0], actors.scope.PROCESS);
      actor.should.be.eql(testActors.ping);
      actor.scope.should.be.eql(actors.scope.PROCESS);
    });
    it('should return pong actor (force scope : local)', function () {
      var aids = actors.getAll('pong');
      aids.should.have.length(1);
      var actor = actors.get(aids[0], actors.scope.LOCAL);
      actor.should.be.eql(testActors.pong);
      actor.scope.should.be.eql(actors.scope.LOCAL);
    });
    it('should return peng actor (force scope : remote)', function () {
      var aids = actors.getAll('peng');
      aids.should.have.length(1);
      var actor = actors.get(aids[0], actors.scope.REMOTE);
      actor.should.be.eql(testActors.peng);
      actor.scope.should.be.eql(actors.scope.REMOTE);
    });
  });

  describe('add function', function () {
    it('should add an actor', function () {
      var actor = {id: 'tmp', container: {id: '12', netInfo: {pid: 123, ip: '1.2.3.4'}}};
      actors.add(actor);
      var aids = actors.getAll('tmp');
      aids.should.have.length(1);
      var retreivedActor = actors.get(aids[0]);
      should.exist(retreivedActor);
      retreivedActor.should.be.eql(actor);
    });
  });

  describe('remove function', function () {
    it('should remove an actor', function () {
      actors.remove('ping');
      var aids = actors.getAll('ping');
      aids.should.have.length(0);
    });
    it('should not remove an actor', function () {
      actors.remove('ping', actors.scope.REMOTE);
      var aids = actors.getAll('ping');
      aids.should.have.length(1);
    });
  });

  describe('removeByContainer function', function () {
    it('should remove peng and pang', function () {
      actors.removeByContainer('2');
      var aids = actors.getAll('peng');
      aids.should.have.length(0);
      aids = actors.getAll('pang');
      aids.should.have.length(0);
    });
  });

  describe('pick function', function () {
    it('should return ping', function () {
      var aid = actors.pick('ping');
      should.exist(aid);
      utils.aid.bare(aid).should.be.eql('ping');
    });
    it('should return a process element', function () {
      var aid = actors.pick('fping');
      should.exist(aid);
      utils.aid.bare(aid).should.be.eql('fping');
      actors.get(aid).scope.should.be.eql(actors.scope.PROCESS);
    });
  });

  describe('exists function', function () {
    it('should return true', function () {
      actors.exists(actors.pick('ping')).should.be.eql(true);
    });
    it('should return false', function () {
      actors.exists(actors.pick('fake')).should.be.eql(false);
    });
  });
});
