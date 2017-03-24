'use strict';

const assert = require('assert');
const request = require('superagent');
const Balancer = require('../lib/balancer');

function createServer(port) {
  const http = require('http');
  const server = http.createServer((req, res) => {
    res.statusCode = 204;
    res.end();
  });
  server.listen(port);
}

describe('Balancer', () => {
  const backendList = [
    {
      ip: '127.0.0.1',
      port: 8000,
    },
    {
      ip: '127.0.0.1',
      port: 8001,
    },
    {
      ip: '127.0.0.1',
      port: 8002,
    },
  ];
  it('init', (done) => {
    createServer(8000);
    createServer(8001);
    createServer(8002);
    setTimeout(done, 1000);
  });

  it('round-robin balancer', () => {
    const balancer = new Balancer(backendList, 'round-robin');

    assert.equal(balancer.getBackend({
      url: '/users/me',
    }).port, 8000);
    assert.equal(balancer.getBackend({
      url: '/users/me',
    }).port, 8001);
  });

  it('first balancer', () => {
    const balancer = new Balancer(backendList, 'first');

    assert.equal(balancer.getBackend({
      url: '/users/me',
    }).port, 8000);
    assert.equal(balancer.getBackend({
      url: '/users/me',
    }).port, 8000);
  });

  it('url balancer', () => {
    const balancer = new Balancer(backendList, 'url');
    assert.equal(balancer.getBackend({
      url: '/users/me',
    }).port, 8001);
    assert.equal(balancer.getBackend({
      url: '/users/me?cache=false',
    }).port, 8002);
  });

  it('url-path balancer', () => {
    const balancer = new Balancer(backendList, 'url-path');

    assert.equal(balancer.getBackend({
      url: '/users/me',
    }).port, 8001);
    assert.equal(balancer.getBackend({
      url: '/users/me?cache=false',
    }).port, 8001);
    assert.equal(balancer.getBackend({
      url: '/users/ab?cache=false',
    }).port, 8000);
  });


  it('leastconn balancer', () => {
    const balancer = new Balancer(backendList, 'leastconn');
    const chooser = balancer.chooser;
    let backend = balancer.getBackend({
      url: '/users/me',
    });
    assert.equal(backend.port, 8000);
    chooser.increase(backend.id);
    assert.equal(balancer.getBackend({
      url: '/users/me',
    }).port, 8001);
    chooser.decrease(backend.id);
    assert.equal(balancer.getBackend({
      url: '/users/me',
    }).port, 8000);
  });


  it('start health check', (done) => {
    const balancer = new Balancer(backendList);
    const ping = (backend) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (backend.port !== 8001) {
            reject(new Error('backend is disabled'));
          } else {
            resolve();
          }
        }, 10).unref();
      });
    };
    const timer = balancer.startHealthCheck({
      ping,
      interval: 300,
    }).unref();
    setTimeout(() => {
      assert.equal(balancer.getBackend({
        url: '/users/me',
      }).port, 8001);
      assert.equal(balancer.getBackend({
        url: '/users/me',
      }).port, 8001);
      assert.equal(balancer.getBackend({
        url: '/users/me',
      }).port, 8001);
      done();
    }, 1000).unref();
  });


  it('request by balancer', (done) => {
    const balancer = new Balancer(backendList);
    const portList = [8000, 8001];
    balancer.on('hit', (backend) => {
      assert.equal(backend.port, portList.shift());
    });
    const plugin = balancer.plugin();
    request.get('/ping')
      .use(plugin)
      .then((res) => {
        assert.equal(res.status, 204);
        assert.equal(res.request.backendServer.port, 8000);
        return request.get('/ping').use(plugin);
      }).then((res) => {
        assert.equal(res.status, 204);
        assert.equal(res.request.backendServer.port, 8001);
        done();
      }).catch(done);
  });

  it('request by leastconn balancer', (done) => {
    const balancer = new Balancer(backendList, 'leastconn');
    const plugin = balancer.plugin();
    request.get('/ping')
      .use(plugin)
      .then((res) => {
        assert.equal(res.status, 204);
        assert.equal(res.request.backendServer.port, 8000);
        return request.get('/ping').use(plugin);
      }).then((res) => {
        assert.equal(res.status, 204);
        assert.equal(res.request.backendServer.port, 8000);
        done();
      }).catch(done);
    request.get('/ping')
      .use(plugin)
      .then((res) => {
        assert.equal(res.status, 204);
        assert.equal(res.request.backendServer.port, 8001);
      }).catch(done);
  });

  it('request https://www.baidu.com/ by balancer', (done) => {
    // request url is not start with '/', it will no use load balancer
    const balancer = new Balancer(backendList);
    const plugin = balancer.plugin();
    request.get('https://www.baidu.com/')
      .use(plugin)
      .then((res) => {
        assert.equal(res.status, 200);
        done();
      }).catch(done);
  });


  it('getAvailableServers ', () => {
    const balancer = new Balancer(backendList);
    const serverList = balancer.getAvailableServers();
    assert.equal(serverList.length, 3);
    assert.equal(serverList[0].port, 8000);
  });

  it('addAlgorithm', () => {
    const balancer = new Balancer(backendList, 'third');
    balancer.addAlgorithm('third', (request) => {
      const index = Math.floor(Math.random() * 1000);
      return Math.floor(index / 3) * 3 + 2;
    });
    for (let i = 0; i < 100; i++) {
      assert.equal(balancer.getBackend({
        url: `${Math.random()}`,
      }).port, 8002);
    }
  });
});
