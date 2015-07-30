var nock = require('nock');
var assert = require('assert');

var Collector = require('../');

suite('influx-collector');

var COLLECTOR_URL = 'http://user:password@example.com:8086/test-db';

test('should create a collector', function(done) {
    Collector('series', COLLECTOR_URL);
    done();
});

test('should do nothing with no url', function(done) {
    var stats = Collector('foo');

    stats.collect({});
    assert.deepEqual(stats._points, undefined);
    done();
});

test('should collect a single data point', function(done) {
    var stats = Collector('series', COLLECTOR_URL);

    var req = nock('http://example.com:8086')
    .filteringRequestBody(/.*/, function(body) {
        return '*';
    })
    .post('/write', '*')
    .query({db: 'test-db', u: 'user', p: 'password', precision: 'ms', database: 'test-db' })
    .reply(200, function(uri, request_body) {
        assert.equal(request_body, 'series foo=34');
    })

    stats.collect({ foo: 34.0 })

    stats.flush();
    setTimeout(function() {
        req.done();
        done();
    }, 100);
});

test('should collect a single data point with tags', function(done) {
    var stats = Collector('series', COLLECTOR_URL);

    var req = nock('http://example.com:8086')
    .filteringRequestBody(/.*/, function(body) {
        return '*';
    })
    .post('/write', '*')
    .query({db: 'test-db', u: 'user', p: 'password', precision: 'ms', database: 'test-db' })
    .reply(200, function(uri, request_body) {
        assert.equal(request_body, 'series,host=cat foo=34');
    })

    stats.collect({ foo: 34.0 }, { host: 'cat' })

    stats.flush();
    setTimeout(function() {
        req.done();
        done();
    }, 100);

});

test('should collect multiple data points', function(done) {
    var stats = Collector('series', COLLECTOR_URL);

    var req = nock('http://example.com:8086')
    .filteringRequestBody(/.*/, function(body) {
        return '*';
    })
    .post('/write', '*\nseries foo=10.2,bar="dog"')
    .query({db: 'test-db', u: 'user', p: 'password', precision: 'ms', database: 'test-db' })
    .reply(200, function(uri, request_body) {
        var expected = 'series bar="cat",foo=34\nseries foo=10.2,bar="dog"';
        assert.equal(request_body, expected);
    });

    stats.collect({ bar: 'cat', foo: 34.0 });
    stats.collect({ foo: 10.2, bar: 'dog' });

    stats.flush();
    setTimeout(function() {
        req.done();
        done();
    }, 100);
});

test('should support instantFlush', function(done) {
    var stats = Collector('series', COLLECTOR_URL + '?instantFlush=yes');

    var req = nock('http://example.com:8086')
    .filteringRequestBody(/.*/, function(body) {
        return '*';
    })
    .post('/write', '*')
    .query({db: 'test-db', u: 'user', p: 'password', precision: 'ms', database: 'test-db' })
    .reply(200, function(uri, request_body) {
        assert.equal(request_body, 'series foo=34');
    });

    stats.collect({ foo: 34.0 });

    setTimeout(function() {
        req.done();
        done();
    }, 100);
});

test('should support a custom flushInterval', function(done) {
    var stats = Collector('series', COLLECTOR_URL + '?flushInterval=500');

    var req = nock('http://example.com:8086')
    .filteringRequestBody(/.*/, function(body) {
        return '*';
    })
    .post('/write', '*')
    .query({db: 'test-db', u: 'user', p: 'password', precision: 'ms', database: 'test-db' })
    .reply(200, function(uri, request_body) {
        assert.equal(request_body, 'series foo=34');
    });

    stats.collect({ foo: 34.0 })

    setTimeout(function() {
        req.done();
        done();
    }, 1000);
});

test('should support a autoFlush=no', function(done) {
    var stats = Collector('series', COLLECTOR_URL + '?flushInterval=500&autoFlush=no');

    var req = nock('http://example.com:8086')
    .filteringRequestBody(/.*/, function(body) {
        return '*';
    })
    .post('/write', '*')
    .query({db: 'test-db', u: 'user', p: 'password', precision: 'ms', database: 'test-db' })
    .reply(200, function(uri, request_body) {
        assert.equal(request_body, 'series foo=34');
    });

    stats.collect({ foo: 34.0 })

    setTimeout(function() {
        assert(req.isDone() == false);

        stats.flush();

        setTimeout(function() {
            req.done();
            done();
        }, 200);
    }, 1000);
});

test('should support time_precision', function(done) {
    var stats = Collector('series', COLLECTOR_URL + '?time_precision=s');

    var req = nock('http://example.com:8086')
    .filteringRequestBody(/.*/, function(body) {
        return '*';
    })
    .post('/write', '*')
    .query({db: 'test-db', u: 'user', p: 'password', precision: 's', database: 'test-db' })
    .reply(200, function(uri, request_body) {
        assert.equal(request_body, 'series foo=34 1416512521');
    });

    stats.collect({ time: 1416512521, foo: 34.0 });

    stats.flush();
    setTimeout(function() {
        req.done();
        done();
    }, 200);
});
