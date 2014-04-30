require('mocha');
var should = require('should');
var _ = require('lodash');

var app = require(__dirname + '/../lib/application');
var actors = require(__dirname + '/../lib/actors');
var cache = require(__dirname + '/../lib/cache');
var properties = require(__dirname + '/../lib/properties');

describe('actors & cache modules', function () {

  beforeEach(function (done) {
    app.start(done);
  });

  afterEach(function (done) {
    app.removeActor('sample');
    app.removeActor('fake');
    app.stop(done);
  });

  describe('add & remove actor', function () {

    it('should add actor to actors and to cache', function (done) {
      var actorAdded = 0;
      var cacheActorAdded = 0;

      function cacheActorAddedListener(aid, cid) {
        cacheActorAdded++;

        should.exist(aid);
        aid.should.have.type('string', 'aid should be a string');
        should.exist(cid);
        aid.should.have.type('string', 'cid should be a string');
        cid.should.be.eql(properties.container.ID);
      }

      function actorAddedListener(aid) {
        actorAdded++;

        should.exist(aid);
        aid.should.have.type('string', 'aid should be a string');

        cacheActorAdded.should.be.eql(1);
        actorAdded.should.be.eql(1);
        cache.removeListener('actor added', cacheActorAddedListener);
        actors.removeListener('actor added', actorAddedListener);
        done();
      }

      cache.on('actor added', cacheActorAddedListener);
      actors.on('actor added', actorAddedListener);

      actors.add({id: 'sample'});
    });

    it('should remove actor from actors and from cache', function (done) {
      var actorRemoved = 0;
      var cacheActorRemoved = 0;

      function cacheActorRemovedListener(aid, cid) {
        cacheActorRemoved++;

        should.exist(aid);
        aid.should.have.type('string', 'aid should be a string');
        should.exist(cid);
        aid.should.have.type('string', 'cid should be a string');
        cid.should.be.eql(properties.container.ID);
      }

      function actorRemovedListener(aid) {
        actorRemoved++;

        should.exist(aid);
        aid.should.have.type('string', 'aid should be a string');

        cacheActorRemoved.should.be.eql(1);
        actorRemoved.should.be.eql(1);
        cache.removeListener('actor removed', cacheActorRemovedListener);
        actors.removeListener('actor removed', actorRemovedListener);
        done();
      }

      cache.on('actor removed', cacheActorRemovedListener);
      actors.on('actor removed', actorRemovedListener);

      actors.add({id: 'sample'});
      actors.remove('sample');
    });
  });
});
