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
const ping = (backend) => {
  const url = `${backend.protocol || "http"}://${backend.ip}/`;
  const check = () => {
    return new Promise((resolve) => {
      request.get(url).then(() => {
        resolve(true);
      }, () => {
        resolve(false);
      });
    });
  };
  const fns = [];
  for (let i = 0; i < 5; i++) {
    fns.push(check());
  }
  return new Promise((resolve, reject) => {
    Promise.all(fns).then((result) => {
      let passCount = 0;
      result.forEach((healthy) => {
        if (healthy) {
          passCount += 1;
        }
      });
      if (passCount >= 3) {
        console.info(`The ${backend.ip} is healthy`);
        resolve();
      } else {
        console.info(`The ${backend.ip} is unhealthy`);
        reject(new Error('The backend is unhealthy'));
      }
    }).catch(reject);
  });
};
balancer.startHealthCheck({
  ping,
});
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
