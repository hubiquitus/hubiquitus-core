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

  it('should ensure an actor exists', function (done) {
    actors.add({id: 'sample'});
    var result = actors.exists('sample');
    should.exist(result);
    result.should.be.eql(true);
    done();
  });

  it('should get an actor from actors', function (done) {
    var actor = {id: 'sample'};
    actors.add(actor);
    var retreivedActor = actors.get('sample');
    should.exist(retreivedActor);
    retreivedActor.should.be.eql(actor);
    done();
  });

  it('should get all added actors id', function (done) {
    actors.add({id: 'sample'});
    actors.add({id: 'fake'});
    var aids = actors.all(actors);
    should.exist(aids);
    aids.should.be.instanceOf(Array);
    aids.should.containEql('sample');
    aids.should.containEql('fake');
    done();
  });

  it('should pick an container from cache', function (done) {
    actors.add({id: 'sample'}); // local actor
    var fakeContainer = {ID: 'fakeContainerID'};
    cache.add('sample', fakeContainer);

    var next = null;
    for (var i = 0; i < 10; i++) {
      var cid = cache.pick('sample');
      should.exist(cid);
      cid.should.have.type('string');
      if (next === null) {
        [properties.container.ID, fakeContainer.ID].should.containEql(cid);
        next = cid;
      } else {
        cid.should.be.eql(next);
      }
      next = (next === properties.container.ID) ? fakeContainer.ID : properties.container.ID;
    }

    done();
  });

  it('should get a container from cache', function (done) {
    actors.add({id: 'sample'});
    var container = cache.getContainer(properties.container.ID);
    should.exist(container);
    container.should.be.eql(properties.container);
    done();
  });

  it('should disable then enable container', function (done) {
    var oldContainerDisableTime = properties.containerDisableTime;
    properties.containerDisableTime = 50;

    actors.add({id: 'sample'});
    cache.disableContainer(properties.container.ID);
    var container = cache.getContainer(properties.container.ID);
    should.exist(container.disabled);
    container.disabled.should.be.eql(true);

    setTimeout(function () {
      var container = cache.getContainer(properties.container.ID);
      should.not.exist(container.disabled);

      properties.containerDisableTime = oldContainerDisableTime;
      done();
    }, 75);
  });

  it('should get all cache actors ids', function (done) {
    actors.add({id: 'sample'});
    cache.add('fake', {ID: 'fakeContainerID'});

    var aids = cache.actors();
    should.exist(aids);
    aids.should.be.instanceOf(Array);
    aids.should.containEql('sample');
    aids.should.containEql('fake');

    done();
  });

  it('should get all cache containers ids', function (done) {
    actors.add({id: 'sample'});
    var fakeContainer = {ID: 'fakeContainerID', name: 'fakeContainer'};
    cache.add({id: 'fake'}, fakeContainer);

    var cids = cache.containers();
    should.exist(cids);
    cids.should.be.instanceOf(Array);
    cids.should.containEql(_.pick(properties.container, ['ID', 'name']));
    cids.should.containEql(fakeContainer);

    done();
  });

  it('should clear cache and sync local actors', function (done) {
    actors.add({id: 'sample'});
    var fakeContainer = {ID: 'fakeContainerID', name: 'fakeContainer'};
    cache.add({id: 'fake'}, fakeContainer);

    function cacheClearedListener() {
      var aids = cache.actors();
      aids.should.containEql('sample');
      aids.should.not.containEql('fake');

      var cids = cache.containers();
      cids.should.containEql(_.pick(properties.container, ['ID', 'name']));
      cids.should.not.containEql(fakeContainer);

      cache.removeListener('cleared', cacheClearedListener);
      done();
    }

    cache.on('cleared', cacheClearedListener);
    cache.clear();
  });
});
