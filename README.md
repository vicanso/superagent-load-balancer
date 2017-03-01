# superagent-load-balancer

[![Build Status](https://travis-ci.org/vicanso/superagent-load-balancer.svg?branch=master)](https://travis-ci.org/vicanso/superagent-load-balancer)
[![Coverage Status](https://img.shields.io/coveralls/vicanso/influxdb-nodejs/master.svg?style=flat)](https://coveralls.io/r/vicanso/superagent-load-balancer?branch=master)
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

  - `name` The name of backend

  - `host` The host of backend

  - `protocol` The protocol, optional, default is 'http'

  - `ip`  The ip of backend, optional

  - `port` The port of backend, optional

  - `weight` The weight of backend, it is for 'round-robin'

  - `backup` Set the backend as backup, optional

- `type` balance algorithm: `url`, `leastconn`, `round-robin`, `first`, `url-path`, default is `round-robin`


```js
const request = require('superagent');
const Balancer = require('superagent-load-balancer');
const balancer = new Balancer([
  {
    host: 'domain.com',
    ip: '192.168.1.1',
    port: 8080,
    weight: 10,
  },
  {
    host: 'domain.com',
    ip: '192.168.1.2',
    port: 8080,
    weight: 2,
  },
]);
const plugin = balancer.plugin();

request.get('/user')
  .use(plugin)
  .then((res) => {
    console.info(res.body);
  })
  .catch(console.error);
```

### startHealthCheck

- `options` {ping: function, interval: ms}

  - `ping` ping function, the function will return promise. If resolve, the backend is healthy. If reject, the backend is sick.

  - `ms`  check interval

  - `window` each check the total count of ping

  - `threshold` each check the healthy count is bigger than threshold, the backend is healthy. Otherwise is sick

```js
const request = require('superagent');
const Balancer = require('superagent-load-balancer');
const balancer = new Balancer([
  {
    host: 'domain1.com',
    weight: 10,
  },
  {
    host: 'domain2.com',
    weight: 2,
  },
]);
const ping = (backend) => {
  const url = `http://${backend.host}/ping`;
  return request.get(url).timeout(300);
};
balancer.startHealthCheck({
  ping,
});

const plugin = balancer.plugin();

request.get('/user')
  .use(plugin)
  .then((res) => {
    console.info(res.body);
  }).catch(console.error);
```

### on

Add listener function to `healthy` or `sick` event

```js
const request = require('superagent');
const Balancer = require('superagent-load-balancer');
const balancer = new Balancer([
  {
    host: 'domain1.com',
    weight: 10,
  },
  {
    host: 'domain2.com',
    weight: 2,
  },
]);
const ping = (backend) => {
  const url = `http://${backend.host}/ping`;
  return request.get(url).timeout(300);
};
balancer.startHealthCheck({
  ping,
});

balancer.on('healthy', (server) => {
  console.info(server);
});
balancer.on('sick', (server) => {
  console.info(server);
});

const plugin = balancer.plugin();

request.get('/user')
  .use(plugin)
  .then((res) => {
    console.info(res.body);
  }).catch(console.error);
```


### getAvailableServers

Get the available server list. It is not disabled and backup.

```js
const request = require('superagent');
const Balancer = require('superagent-load-balancer');
const balancer = new Balancer([
  {
    host: 'domain1.com',
    weight: 10,
  },
  {
    host: 'domain2.com',
    weight: 2,
    backup: true,
  },
]);
const ping = (backend) => {
  const url = `http://${backend.host}/ping`;
  return request.get(url).timeout(300);
};
balancer.startHealthCheck({
  ping,
});
// [ { id: '51d27b36cb9c34ff', host: 'domain1.com', weight: 10 } ]
console.info(balancer.getAvailableServers());
```

### addAlgorithm

Add the custom load balance algorithm

- `name` The algorithm's name

- `fn` The algorithm, it should return an integer.

```js
const request = require('superagent');
const Balancer = require('superagent-load-balancer');
const balancer = new Balancer([
  {
    host: 'domain1.com',
  },
  {
    host: 'domain2.com',
  },
], 'getByUrl');
balancer.addAlgorithm('getByUrl', (request) => {
  return request.url.length;
});

const plugin = balancer.plugin();

request.get('/user')
  .use(plugin)
  .then((res) => {
    console.info(res.body);
  })
  .catch(console.error);
```

## License

MIT
