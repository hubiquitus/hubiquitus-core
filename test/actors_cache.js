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

  describe('add actor', function () {

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
  });
});
