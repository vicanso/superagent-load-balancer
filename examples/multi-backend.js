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

request.get('/')
  .use(loadBalancer)
  .end(function(err, res) {
    if (err) {
      console.error(err);
    } else {
      assert.equal(res.request._backend.ip, '220.181.57.217');
      assert.equal(res.status, 200);
    }
  });


request.get('/')
  .use(loadBalancer)
  .end(function(err, res) {
    if (err) {
      console.error(err);
    } else {
      assert.equal(res.request._backend.ip, '111.13.101.208');
      assert.equal(res.status, 200);
    }
  });