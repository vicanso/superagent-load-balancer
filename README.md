# superagent-load-balancer

[![Build Status](https://travis-ci.org/vicanso/superagent-load-balancer.svg?branch=master)](https://travis-ci.org/vicanso/superagent-load-balancer)

Load balancer plugin for superagent

## Installation

```bash
$ npm install superagent-load-balancer
```

## API

### get

- `backends` the backend list

- `type` balance algorithm, `uri`, `leastconn`, `round-robin`

```js
var request = require('superagent');
var superagentLoadBalancer = require('superagent-load-balancer');
var balancer = superagentLoadBalancer.get([
	{
		host: 'domain.com',
		ip: '192.168.1.1', // optional
		port: 8080, // optional
		weight: 10 // optional
	},
	{
		host: 'domain.com',
		ip: '192.168.1.2', // optional
		port: 8080, // optional
		weight: 1
	}
], 'round-robin');

request.get('/user')
	.use(balancer)
	.end(function(err, res) {

	});
```


## License

MIT
