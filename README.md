# influx-collector [![Build Status](https://travis-ci.org/defunctzombie/node-influx-collector.svg?branch=master)](https://travis-ci.org/defunctzombie/node-influx-collector)

[InfluxDB](http://influxdb.com/) stats collector for node.js

#### For InfluxDB 0.9.x use version 1.x.x of this module.

#### For InfluxDB <= 0.8.x use version 0.x.x of this module.

Note that the API changed between 0.x and 1.x to move the series name into the constructor.

## quickstart

```js
// set some env var (i.e INFLUX_STATS_URI)
// http://user:password@influxdb.host.com/stats-db;

var Stats = require('influx-collector');

// create a stats collector
var mem_stats = Stats('process-memory-usage', process.env.INFLUX_STATS_URI);

// example stat collection of process memory usage
setInterval(function() {
    var mem = process.memoryUsage();

    // collect this stat into the 'process-memory-usage' series
    // first argument is the data points
    // second (optional) argument are the tags
    mem_stats.collect({
        rss: mem.rss,
        heap_total: mem.heapTotal,
        heap_used: mem.heapUsed
    }, {
        pid: process.pid,
        app: 'my-app'
    });
}, 10 * 1000);

// make sure to handle errors to avoid uncaughtException
// would be annoying if stats crashed your app :)
mem_stats.on('error', function(err) {
    console.error(err); // or whatever you want
});
```

## Options

influx-collector is configured via the URI string. The following options can be set by specifying them as query parameters in the URI

| Param | Default | Description |
| --- | --- | --- |
| autoFlush | yes | Specify `no` to avoid stats flushing automatically. See `flushing` below. |
| flushInterval | 5000 | Stats are flushed every flushInterval milliseconds. |
| instantFlush | no | Flush stats to server on collection. |
| time_precision |  | Time precision when writing data. Only relevant if you are specifying the `time` field. |

## Flushing and Batches

By default, stats are flushed in batches every `flushInterval` milliseconds. This allows for many stats to be collected and flushed at once. You can override these behaviors via the `autoFlush` and interval options as query parameters. You can also turn on `instantFlush` which will send the stats to InfluxDB as soon as they are collected (every collect call will be an http request). I do not recommend this approach for high frequency stats.

Example of a 10 second flush interval

```
http://user:password@influxdb.host.com/stats-db?flushInterval=10000
```

### Stat#flush()

To manually flush the stats at any time (or if autoFlush is off), use the `.flush` method on your stats instance.

## Protips

* Make sure to attach and `error` handler so stats don't crash your entire app.
* Useful to log pid and app names/tags for generic stats so you can `group by` later.
* [Grafana](http://grafana.org/) is amazing.
