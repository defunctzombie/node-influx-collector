var nock = require('nock');
var assert = require('assert');

var Collector = require('../');

suite('influx-collector');

var COLLECTOR_URL = 'http://user:password@example.com/test-db';

test('should create a collector', function(done) {
    Collector(COLLECTOR_URL);
    done();
});

test('should collect a single data point', function(done) {
    var stats = Collector(COLLECTOR_URL);

    var expected = [{
        name: 'test-series',
        columns: ['foo'],
        points: [
            [34.0]
        ]
    }];

    var req = nock('http://example.com:8086')
    .post('/db/test-db/series', expected)
    .reply(200)

    stats.collect('test-series', { foo: 34.0 })

    stats.flush();
    req.done();
    done();
});

test('should collect multiple data points', function(done) {
    var stats = Collector(COLLECTOR_URL);

    var expected = [{
        name: 'test-series',
        columns: ['bar', 'foo'],
        points: [
            ['cat', 34.0],
            ['dog', 10.2]
        ]
    }];

    var req = nock('http://example.com:8086')
    .post('/db/test-db/series', expected)
    .reply(200)

    stats.collect('test-series', { bar: 'cat', foo: 34.0 });
    stats.collect('test-series', { foo: 10.2, bar: 'dog' });

    stats.flush();
    req.done();
    done();
});

test('should collect multiple data points for multiple series', function(done) {
    var stats = Collector(COLLECTOR_URL);

    var expected = [{
        name: 'test-series',
        columns: ['bar', 'foo'],
        points: [
            ['cat', 34.0],
            ['dog', 10.2]
        ]
    }, {
        name: 'test-series',
        columns: ['bar', 'foo', 'more'],
        points: [
            ['goat', 44, 'baz']
        ]
    }, {
        name: 'another-series',
        columns: ['bar', 'foo'],
        points: [
            ['gym', 90]
        ]
    }];

    var req = nock('http://example.com:8086')
    .post('/db/test-db/series', expected)
    .reply(200)

    stats.collect('test-series', { bar: 'cat', foo: 34.0 });
    stats.collect('test-series', { foo: 10.2, bar: 'dog' });
    stats.collect('test-series', { foo: 44, bar: 'goat', more: 'baz' });
    stats.collect('another-series', { foo: 90, bar: 'gym' });

    stats.flush();
    req.done();
    done();
});

test('should support instantFlush', function(done) {
    var stats = Collector(COLLECTOR_URL + '?instantFlush=yes');

    var expected = [{
        name: 'test-series',
        columns: ['foo'],
        points: [
            [34.0]
        ]
    }];

    var req = nock('http://example.com:8086')
    .post('/db/test-db/series', expected)
    .reply(200)

    stats.collect('test-series', { foo: 34.0 })

    req.done();
    done();
});

test('should support a custom flushInterval', function(done) {
    var stats = Collector(COLLECTOR_URL + '?flushInterval=500');

    var expected = [{
        name: 'test-series',
        columns: ['foo'],
        points: [
            [34.0]
        ]
    }];

    var req = nock('http://example.com:8086')
    .post('/db/test-db/series', expected)
    .reply(200)

    stats.collect('test-series', { foo: 34.0 })

    setTimeout(function() {
        req.done();
        done();
    }, 1000);
});

test('should support a autoFlush=no', function(done) {
    var stats = Collector(COLLECTOR_URL + '?flushInterval=500&autoFlush=no');

    var expected = [{
        name: 'test-series',
        columns: ['foo'],
        points: [
            [34.0]
        ]
    }];

    var req = nock('http://example.com:8086')
    .post('/db/test-db/series', expected)
    .reply(200)

    stats.collect('test-series', { foo: 34.0 })

    setTimeout(function() {
        assert(req.isDone() == false);

        stats.flush();
        req.done();
        done();
    }, 1000);
});
