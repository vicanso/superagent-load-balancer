'use strict';
var assert = require('assert');
var request = require('superagent');
var superagentLoadBalancer = require('..');
var backends = [
  {
    host: 'www.baidu.com',
    ip: '220.181.57.217'
  },
  {
    host: 'www.baidu.com',
    ip: '111.13.101.208'
  }
];
var loadBalancer = superagentLoadBalancer.get(backends);

function get() {
  request.get('/')
    .use(loadBalancer)
    .end(function(err, res) {
      if (err) {
        console.error(err);
      } else {
      	backends.forEach(function(backend) {
      		assert(!backend.disabled);
      	});
        assert.equal(res.status, 200);
      }
    });
}
superagentLoadBalancer.healthCheck(backends, {
	ping: function(backend, cb) {
		var url = 'http://' + backend.host + '/';
    request.get(url).end(cb);
	}
})


setInterval(get, 1000);