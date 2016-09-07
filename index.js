var EventEmitter = require('events').EventEmitter;
var influx = require('influx');
var url = require('url');

// create a collector for the given series
function Collector(series, uri) {
    if (!(this instanceof Collector)) {
        return new Collector(series, uri);
    }

    var self = this;

    if (!uri) {
        return;
    }

    if (!series) {
        throw new Error('series name must be specified');
    }

    var parsed = url.parse(uri, true /* parse query args */);

    var username = undefined;
    var password = undefined;

    if (parsed.auth) {
        var parts = parsed.auth.split(':');
        username = parts.shift();
        password = parts.shift();
    }

    self._client = influx({
        host : parsed.hostname,
        port : parsed.port,
        protocol : parsed.protocol,
        username : username,
        password : password,
        database : parsed.pathname.slice(1) // remove leading '/'
    })

    self._points = [];

    var opt = parsed.query || {};

    self._series_name = series;
    self._instant_flush = opt.instantFlush == 'yes';
    self._time_precision = opt.time_precision;

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

MTU_SIZE = 1400; // Conservative estimate for the Maximum transmission unit.

Collector.prototype.computePointCountToSend = function(pointSizes, upperBound) {
  var index = 0;
  var sum = 0;
  while (index < pointSizes.length && sum <= upperBound) {
    sum += pointSizes[index];
    ++index;
  }
  if (sum > upperBound) {
    --index;
  }
  index = Math.max(index, 1); // Always send at least one point.
  return Math.min(index, pointSizes.length); // But not if there were no points at all.
};

Collector.prototype.flush = function() {
    var self = this;

    if (!self._points || self._points.length === 0) {
        return;
    }

    // only send N points at a time to avoid making requests too large
    // TODO what if we are backed up?

    var spliceIndex = self.computePointCountToSend(self._points.map(function (point) {
      return JSON.stringify(point).length;
    }), MTU_SIZE);
    var points = self._points.splice(0, spliceIndex);
    var opt = { precision: self._time_precision };

    self._client.writePoints(self._series_name, points, opt, function(err) {
        if (err) {
            // TODO if error put points back to send again?
            return self.emit('error', err);
        }

        // there are more points to flush out
        if (self._points.length >0) {
            setImmediate(self.flush.bind(self));
        }
    });
};

// collect a data point (or object)
// @param [Object] value the data
// @param [Object] tags the tags (optional)
Collector.prototype.collect = function(value, tags) {
    var self = this;

    // disabled (due to no URL)
    if (!self._points) {
        return;
    }

    self._points.push([value, tags]);
    if (self._instant_flush) {
        self.flush();
    }
};

module.exports = Collector;
