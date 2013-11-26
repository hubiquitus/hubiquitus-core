require('mocha');
var should = require('should');
var actors = require(__dirname + '/../lib/actors');
var h = require(__dirname + '/../lib/hubiquitus');
var logger = require(__dirname + '/../lib/logger');
logger.level = 'info';
var _ = require('lodash');

describe('actors module', function () {
  var originalHID = h.ID;
  var originalNetInfo = h.netInfo;

  var testActors = {
    ping: {id: 'ping', container: {id: '0', netInfo: {pid: 0, ip: '0.0.0.0'}}},
    pong: {id: 'pong', container: {id: '0', netInfo: {pid: 1, ip: '0.0.0.0'}}},
    peng: {id: 'peng', container: {id: '2', netInfo: {pid: 3, ip: '1.1.1.1'}}},
    pang: {id: 'pang', container: {id: '2', netInfo: {pid: 3, ip: '1.1.1.1'}}},
    fping1: {id: 'fping/1', container: {id: '0', netInfo: {pid: 0, ip: '0.0.0.0'}}},
    fping2: {id: 'fping/2', container: {id: '0', netInfo: {pid: 1, ip: '0.0.0.0'}}},
    fping4: {id: 'fping/3', container: {id: '2', netInfo: {pid: 3, ip: '1.1.1.1'}}}
  };
  var testActorsCount = _.keys(testActors).length;

  before(function () {
    h.ID = 0;
    h.netInfo = {pid: 0, ip: '0.0.0.0'};
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
    _.forOwn(testActors, function (actor) {
      actors.remove(actor.id);
    });
  });

  describe('get function', function () {
    it('should return ping actor', function () {
      var actor = actors.get('ping');
      should.exist(actor);
      actor.should.be.eql(testActors.ping);
      actor.scope.should.be.eql(actors.scope.PROCESS);
    });
    it('should return null', function () {
      should.not.exist(actors.get('fake'));
    });
    it('should return ping actor (force scope : process)', function () {
      var actor = actors.get('ping', actors.scope.PROCESS);
      should.exist(actor);
      actor.should.be.eql(testActors.ping);
      actor.scope.should.be.eql(actors.scope.PROCESS);
    });
    it('should return pong actor (force scope : local)', function () {
      var actor = actors.get('pong', actors.scope.LOCAL);
      should.exist(actor);
      actor.should.be.eql(testActors.pong);
      actor.scope.should.be.eql(actors.scope.LOCAL);
    });
    it('should return peng actor (force scope : remote)', function () {
      var actor = actors.get('peng', actors.scope.REMOTE);
      should.exist(actor);
      actor.should.be.eql(testActors.peng);
      actor.scope.should.be.eql(actors.scope.REMOTE);
    });
  });

  describe('add function', function () {
    it('should add an actor', function () {
      var actor = {id: 'tmp', container: {id: '12', netInfo: {pid: 123, ip: '1.2.3.4'}}};
      actors.add(actor);
      var retreivedActor = actors.get('tmp');
      should.exist(retreivedActor);
      retreivedActor.should.be.eql(actor);
    });
  });

  describe('remove function', function () {
    it('should remove an actor', function () {
      actors.remove('ping');
      var retreivedActor = actors.get('ping');
      should.not.exist(retreivedActor);
    });
  });

  describe('removeByContainer function', function () {
    it('should remove peng and pang', function () {
      actors.removeByContainer('2');
      var retreivedActor = actors.get('peng');
      should.not.exist(retreivedActor);
      retreivedActor = actors.get('pang');
      should.not.exist(retreivedActor);
    });
  });

  describe('exists function', function () {
    it('should return true', function () {
      actors.exists('ping').should.be.eql(true);
    });
    it('should return false', function () {
      actors.exists('fake').should.be.eql(false);
    });
  });

  describe('pick function', function () {
    it('should return ping', function () {
      var aid = actors.pick('ping');
      should.exist(aid);
      aid.should.be.eql('ping');
    });
    it('should return a process element', function () {
      var aid = actors.pick('fping');
      should.exist(aid);
      aid.should.have.type('string');
      actors.get(aid).scope.should.be.eql(actors.scope.PROCESS);
    });
  });

  describe('pickAll function', function () {
    it('should return fping1', function () {
      var aids = actors.pickAll('fping/1');
      should.exist(aids);
      aids.should.be.an.instanceof(Array);
      aids.should.have.length(1);
      aids[0].should.be.eql('fping/1');
    });
    it('should return one element', function () {
      var aids = actors.pickAll('fping');
      should.exist(aids);
      aids.should.be.an.instanceof(Array);
      aids.should.have.length(3);
    });
    it('should return one element', function () {
      var aids = actors.pickAll('fping', actors.scope.REMOTE);
      should.exist(aids);
      aids.should.be.an.instanceof(Array);
      aids.should.have.length(1);
    });
  });
});
