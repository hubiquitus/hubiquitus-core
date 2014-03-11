/*
 * The process.nextTick in those tests are used to avoid AssertionError to be caught by a try/catch in the tested code.
 */

require('mocha');
var should = require('should');
var _ = require('lodash');

var app = require(__dirname + '/../lib/application');
var actors = require(__dirname + '/../lib/actors');

describe('application module', function () {

  before(function (done) {
    app.start(done);
  });

  after(function (done) {
    app.stop(done);
  });

  afterEach(function (done) {
    actors.clear();
    done();
  });

  it('basic request/reply', function (done) {
    var count = 0;
    app.addActor('sample', function (req) {
      count++;
      req.reply();
    });

    app.send('tmp', 'sample', 'hello', function (err) {
      process.nextTick(function () {
        should.not.exist(err);
        count.should.be.eql(1);
        done();
      });
    });
  });

  it('send failure due to a timeout', function (done) {
    app.send('tmp', 'sample', 'hello', 1, function (err) {
      process.nextTick(function () {
        should.exist(err);
        err.should.have.key('code');
        err.code.should.be.eql('TIMEOUT');
        done();
      });
    });
  });

  it('middlewares', function (done) {
    var counts = {
      'req_out': 0,
      'req_in': 0,
      'res_out': 0,
      'res_in': 0
    };
    app.use(function (type, msg, next) {
      process.nextTick(function () {
        type.should.be.type('string');
        _.keys(counts).should.containEql(type);
        msg.should.be.type('object');
        next.should.be.type('function');
        counts[type]++;
        next();
      });
    });

    app.addActor('sample', function (req) {
      req.reply();
    });

    app.send('tmp', 'sample', 'hello', function (err) {
      process.nextTick(function () {
        should.not.exist(err);
        _.forEach(counts, function (value, key) {
          value.should.be.eql(1, key + ' should be 1');
        });
        done();
      });
    });
  });
});
