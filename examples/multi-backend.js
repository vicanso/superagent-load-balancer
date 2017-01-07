'use strict';
const assert = require('assert');
const request = require('superagent');
const Balancer = require('..');
const backends = [
  {
    host: 'www.baidu.com',
    ip: '220.181.57.217'
  },
  {
    host: 'www.baidu.com',
    ip: '111.13.101.208'
  }
];
const balancer = new Balancer(backends);
const plugin = balancer.plugin();

request.get('/')
  .use(plugin)
  .then((res) => {
    console.info(res.text);
    assert.equal(res.request.backendServer.ip, backends[0].ip);
    assert.equal(res.status, 200);
  }).catch(console.error);


request.get('/')
  .use(plugin)
  .then((res) => {
    console.info(res.text);
    assert.equal(res.request.backendServer.ip, backends[1].ip);
    assert.equal(res.status, 200);
  }).catch(console.error);