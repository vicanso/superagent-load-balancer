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

- `type` balance algorithm: `url`, `leastconn`, `round-robin`, `first`, `url-path`, default is `round-robin`


- `backend.name` The name of backend

- `backend.host` The host of backend

- `backend.protocol` The protocol, optional, default is 'http'

- `backend.ip`  The ip of backend, optional

- `backend.port` The port of backend, optional

- `backend.weight` The weight of backend, it is for 'round-robin'

- `backend.backup` Set the backend as backup, optional

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

The ping function will return promise. If resolve, the backend is health. If reject, the backend is unhealthy.

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
  })
  .catch(console.error);

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

## License

MIT
