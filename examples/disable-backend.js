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
var loadBalancer = superagentLoadBalancer.get(backends, 'first');
var backendIP = '220.181.57.217'



function get() {
  request.get('/')
    .use(loadBalancer)
    .end(function(err, res) {
      if (err) {
        console.error(err);
      } else {
        assert.equal(res.request._backend.ip, backendIP);
        assert.equal(res.status, 200);
      }
    });
}

setInterval(get, 1 * 1000);

// assume that the backend is down
setTimeout(function() {
  backends[0].disabled = true;
  backendIP = '111.13.101.208';
}, 5000);