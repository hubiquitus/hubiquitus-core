/*
 * The process.nextTick in those tests are used to avoid AssertionError to be caught by a try/catch in the tested code.
 */

require('mocha');
var should = require('should');
var _ = require('lodash');

var app = require(__dirname + '/../lib/application');
var monitoring = require(__dirname + '/../lib/monitoring');

describe('monitoring events', function () {

  before(function (done) {
    app.start(done);
  });

  after(function (done) {
    app.stop(done);
  });

  it('events (inproc communication)', function (done) {
    var counts = {
      actorAdded: 0,
      actorRemoved: 0,
      reqSent: 0,
      reqReceived: 0,
      resSent: 0,
      resReceived: 0
    };

    monitoring.on('actor added', function (aid, scope) {
      counts.actorAdded++;
      aid.should.have.type('string', 'Actor added aid should be a string');
      scope.should.be.eql('process', 'Actor added scope should be "process"');
    });

    monitoring.on('actor removed', function (aid, scope) {
      counts.actorRemoved++;
      aid.should.have.type('string', 'Actor removed aid should be a string');
      scope.should.be.eql('process', 'Actor removed scope should be "process"');
    });

    monitoring.on('req sent', function (req) {
      should.exist(req, 'Req sent should exist');
      req.should.have.type('object', 'Req sent should be an object');
      counts.reqSent++;
    });

    monitoring.on('req received', function (req) {
      should.exist(req, 'Req received should exist');
      req.should.have.type('object', 'Req received should be an object');
      counts.reqReceived++;
    });

    monitoring.on('res sent', function (res) {
      should.exist(res, 'Res sent should exist');
      res.should.have.type('object', 'Res sent should be an object');
      counts.resSent++;
    });

    monitoring.on('res received', function (req) {
      should.exist(req, 'Res received should exist');
      req.should.have.type('object', 'Res received should be an object');
      counts.resReceived++;
    });

    app.addActor('sample', function (req) {
      req.reply();
    });

    app.send('tmp', 'sample', 'Hello', function () {
      app.removeActor('sample');
      process.nextTick(function () {
        counts.actorAdded.should.be.eql(1, 'One actor should have been added');
        counts.actorRemoved.should.be.eql(1, 'One actor should have been removed');
        counts.reqSent.should.be.eql(1, 'One request should have been sent');
        counts.reqReceived.should.be.eql(1, 'One request should have been received');
        counts.resSent.should.be.eql(1, 'One response should have been sent');
        counts.resReceived.should.be.eql(1, 'One response should have been received');
        done();
      });
    });
  });
});
