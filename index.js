var EventEmitter = require('events').EventEmitter;
var superagent = require('superagent');
var url = require('url');

// http://influxdb.com/docs/v0.7/api/reading_and_writing_data.html

function Collector(uri) {
    if (!(this instanceof Collector)) {
        return new Collector(uri);
    }

    var self = this;

    var parsed = url.parse(uri, true /* parse query args */);

    var info = {
        protocol: parsed.protocol,
        slashes: parsed.slashes,
        port: parsed.port || 8086,
        auth: parsed.auth,
        hostname: parsed.hostname,
        pathname: '/db' + parsed.pathname + '/series',
    };

    self._uri = url.format(info);

    self.collections = Object.create(null);

    var opt = parsed.query || {};

    self._instant_flush = opt.instantFlush == 'yes';

    // no automatic flush
    if (opt.autoFlush == 'no' || self._instant_flush) {
        return;
    }

    var flush_interval = opt.flushInterval || 5000;

    // flush on an interval
    // or option to auto_flush=false
    setInterval(function() {
        self.flush();
    }, flush_interval).unref();
}

Collector.prototype.__proto__ = EventEmitter.prototype;

Collector.prototype.flush = function() {
    var self = this;

    var body = [];

    Object.keys(self.collections).forEach(function(key) {
        body.push(self.collections[key]);
    });

    if (body.length === 0) {
        return;
    }

    superagent
    .post(self._uri)
    .send(body)
    .end(function(err, res) {
        if (err) {
            return self.emit('error', err);
        }

        if (res.status !== 200) {
            return self.emit('error', new Error(res.text));
        }
    });

    self.collections = [];
};

Collector.prototype.collect = function(series, obj) {
    var self = this;
    var collections = self.collections;

    var keys = Object.keys(obj).sort();
    var key = series + keys.join('');

    var collection = self.collections[key];
    if (!collection) {
        collection = self.collections[key] = {
            name: series,
            columns: keys,
            points: []
        };
    }

    var points = new Array(keys.lenth);
    for (var i=0 ; i<keys.length ; ++i) {
        points[i] = obj[keys[i]];
    }

    collection.points.push(points);

    if (self._instant_flush) {
        self.flush();
    }
};

module.exports = Collector;
