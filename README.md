# superagent-load-balancer

[![Build Status](https://travis-ci.org/vicanso/superagent-load-balancer.svg?branch=master)](https://travis-ci.org/vicanso/superagent-load-balancer)
[![npm](http://img.shields.io/npm/v/superagent-load-balancer.svg?style=flat-square)](https://www.npmjs.org/package/superagent-load-balancer)
[![Github Releases](https://img.shields.io/npm/dm/superagent-load-balancer.svg?style=flat-square)](https://github.com/vicanso/superagent-load-balancer)

Load balancer plugin for superagent

## Installation

```bash
$ npm install superagent-load-balancer
```

## Examples

View the [./examples](examples) directory for working examples. 


## API

### get

- `backends` the backend list

- `type` balance algorithm: `url`, `leastconn`, `round-robin`, `first`, `url-path`, default is `round-robin`

```js
var request = require('superagent');
var superagentLoadBalancer = require('superagent-load-balancer');
var balancer = superagentLoadBalancer.get([
  {
    host: 'domain.com',
    ip: '192.168.1.1', // optional
    port: 8080, // optional
    weight: 10, // optional
    disabled: false // optional
  },
  {
    host: 'domain.com',
    ip: '192.168.1.2', // optional
    port: 8080, // optional
    weight: 1, // optional
    disabled: false // optional
  }
], 'round-robin');

request.get('/user')
  .use(balancer)
  .end(function(err, res) {

  });
```

### healthCheck

- `backends` the backend list

- `options` {ping: function, interval: ms}

```js
var request = require('superagent');
var superagentLoadBalancer = require('superagent-load-balancer');
superagentLoadBalancer.healthCheck([
  {
    host: 'domain.com',
    ip: '192.168.1.1', // optional
    port: 8080, // optional
    weight: 10, // optional
    disabled: false // optional
  },
  {
    host: 'domain.com',
    ip: '192.168.1.2', // optional
    port: 8080, // optional
    weight: 1, // optional
    disabled: false // optional
  }
], {
  ping: function(backend, cb) {
    var url = 'http://' + backend.host + '/ping';
    request.get(url).end(cb);
  },
  interval: 1000
});

```
## License

MIT
