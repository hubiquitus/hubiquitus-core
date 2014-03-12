/*
 * The process.nextTick in those tests are used to avoid AssertionError to be caught by a try/catch in the tested code.
 */

require('mocha');
var should = require('should');
var _ = require('lodash');

var app = require(__dirname + '/../lib/application');
var actors = require(__dirname + '/../lib/actors');
var utils = {
  aid: require(__dirname + '/../lib/utils/aid')
};

describe('application mecanisms', function () {

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

  it('inproc request/reply sample->tmp', function (done) {
    var count = 0;
    var id = '';
    app.addActor('sample', function (req) {
      count++;
      var _this = this;
      process.nextTick(function () {
        should.exist(req, 'actor sample : req should exist');
        req.should.have.keys('from', 'to', 'content', 'timeout', 'cb', 'date', 'id', 'headers', 'reply');
        utils.aid.bare(_this.id).should.be.eql('sample', 'actor sample : this.id should be "sample"');
        utils.aid.bare(req.from).should.be.eql('tmp', 'actor sample : req.from should be "tmp"');
        utils.aid.bare(req.to).should.be.eql('sample', 'actor sample : req.to should be "sample"');
        req.content.should.be.eql('hello', 'actor sample : req.content should be "hello"');
        req.timeout.should.be.eql(2000, 'actor sample : req.timeout should be "2000"');
        req.cb.should.be.eql(true, 'actor sample : req.cb.should.be "true"');
        req.date.should.have.type('number', 'actor sample : req.date should be a number');
        req.headers.should.have.type('object', 'actor sample : req.headers should be an object');
        req.headers.should.be.empty;
        req.id.should.have.type('string', 'actor sample : req.id should be a string');
        id = req.id;
        req.reply.should.have.type('function', 'actor sample : req.reply should be a function');
        req.reply(null, 'hi');
      });
    });

    app.send('tmp', 'sample', 'hello', 2000, function (err, res) {
      process.nextTick(function () {
        should.exist(res, 'actor tmp : res should exist');
        res.should.have.keys('from', 'to', 'content', 'err', 'date', 'id', 'headers');
        should.not.exist(res.err, 'actor tmp : res.error should be null');
        utils.aid.bare(res.from).should.be.eql('sample', 'actor tmp : res.from should be "sample"');
        utils.aid.bare(res.to).should.be.eql('tmp', 'actor tmp : res.to should be "tmp"');
        res.content.should.be.eql('hi', 'actor tmp : res.content should be "hi"');
        res.date.should.have.type('number', 'actor tmp : res.date should be a number');
        res.headers.should.have.type('object', 'actor tmp : res.headers should be an object');
        res.headers.should.be.empty;
        res.id.should.have.type('string', 'actor tmp : res.id should be a string');
        res.id.should.be.eql(id);
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
