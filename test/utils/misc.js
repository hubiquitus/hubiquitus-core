var sinon = require('sinon');
require('mocha');
require('should');
var os = require('os');
var misc = require(__dirname + '/../../lib/utils/misc');

describe('misc module', function () {

  describe('roundRobin function', function () {
    it('should return next value', function () {
      var collection = ['one', 'two', 'three'];
      misc.roundRobin('test', collection).should.be.eql('one');
      misc.roundRobin('test', collection).should.be.eql('two');
      misc.roundRobin('test', collection).should.be.eql('three');
      misc.roundRobin('test', collection).should.be.eql('one');
    });
  });
});
