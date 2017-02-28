'use strict';

const assert = require('assert');
const request = require('superagent');
const Balancer = require('../lib/balancer');

describe('Balancer', () => {
  it('round-robin balancer', () => {
    const balancer = new Balancer([
      {
        ip: '127.0.0.1',
        port: 8086,
      },
      {
        ip: '192.168.1.2',
        port: 8086,
      },
    ], 'round-robin');

    assert.equal(balancer.getBackend('/users/me').ip, '127.0.0.1');
    assert.equal(balancer.getBackend('/users/me').ip, '192.168.1.2');
  });

  it('first balancer', () => {
    const balancer = new Balancer([
      {
        ip: '127.0.0.1',
        port: 8086,
      },
      {
        ip: '192.168.1.2',
        port: 8086,
      },
    ], 'first');

    assert.equal(balancer.getBackend('/users/me').ip, '127.0.0.1');
    assert.equal(balancer.getBackend('/users/me').ip, '127.0.0.1');
  });

  it('url balancer', () => {
    const balancer = new Balancer([
      {
        ip: '127.0.0.1',
        port: 8086,
      },
      {
        ip: '192.168.1.2',
        port: 8086,
      },
    ], 'url');

    assert.equal(balancer.getBackend('/users/me').ip, '127.0.0.1');
    assert.equal(balancer.getBackend('/users/me?no-cache').ip, '192.168.1.2');
  });

  it('url-path balancer', () => {
    const balancer = new Balancer([
      {
        ip: '127.0.0.1',
        port: 8086,
      },
      {
        ip: '192.168.1.2',
        port: 8086,
      },
    ], 'url-path');

    assert.equal(balancer.getBackend('/users/me').ip, '127.0.0.1');
    assert.equal(balancer.getBackend('/users/me?cache=false').ip, '127.0.0.1');
    assert.equal(balancer.getBackend('/users/ab?cache=false').ip, '192.168.1.2');
  });


  it('leastconn balancer', () => {
    const balancer = new Balancer([
      {
        ip: '127.0.0.1',
        port: 8086,
      },
      {
        ip: '192.168.1.2',
        port: 8086,
      },
    ], 'leastconn');
    const chooser = balancer.chooser;
    let backend = balancer.getBackend('/users/me');
    assert.equal(backend.ip, '127.0.0.1');
    chooser.increase(backend.id);
    assert.equal(balancer.getBackend('/users/me').ip, '192.168.1.2');
    chooser.decrease(backend.id);
    assert.equal(balancer.getBackend('/users/me').ip, '127.0.0.1');
  });


  it('start health check', (done) => {
    const balancer = new Balancer([
      {
        ip: '127.0.0.1',
        port: 8086,
      },
      {
        ip: '192.168.1.2',
        port: 8086,
      },
    ]);
    const ping = (backend) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (backend.ip !== '127.0.0.1') {
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
      assert.equal(balancer.getBackend('/users/me').ip, '127.0.0.1');
      assert.equal(balancer.getBackend('/users/me').ip, '127.0.0.1');
      assert.equal(balancer.getBackend('/users/me').ip, '127.0.0.1');
      done();
    }, 1000).unref();
  });


  it('request by balancer', (done) => {
    const balancer = new Balancer([
      {
        ip: '127.0.0.1',
        port: 8086,
      },
      {
        host: 'localhost',
        ip: '127.0.0.1',
        port: 8086,
      },
    ]);
    const plugin = balancer.plugin();
    request.get('/ping')
      .use(plugin)
      .then((res) => {
        assert.equal(res.status, 204);
        assert.equal(res.request.backendServer.ip, '127.0.0.1');
        return request.get('/ping').use(plugin);
      }).then((res) => {
        assert.equal(res.status, 204);
        assert.equal(res.request.backendServer.host, 'localhost');
        done();
      }).catch(done);
  });

  it('request by leastconn balancer', (done) => {
    const balancer = new Balancer([
      {
        ip: '127.0.0.1',
        port: 8086,
      },
      {
        host: 'localhost',
        port: 8086,
      },
    ], 'leastconn');
    const plugin = balancer.plugin();
    request.get('/ping')
      .use(plugin)
      .then((res) => {
        assert.equal(res.status, 204);
        assert.equal(res.request.backendServer.ip, '127.0.0.1');
        return request.get('/ping').use(plugin);
      }).then((res) => {
        assert.equal(res.status, 204);
        assert.equal(res.request.backendServer.ip, '127.0.0.1');
        done();
      }).catch(done);
    request.get('/ping')
      .use(plugin)
      .then((res) => {
        assert.equal(res.status, 204);
        assert.equal(res.request.backendServer.host, 'localhost')
      }).catch(done);
  });

  it('request https://www.baidu.com/ by balancer', (done) => {
    const balancer = new Balancer([
      {
        ip: '127.0.0.1',
        port: 8086,
      },
      {
        host: 'localhost',
        port: 8086,
      },
    ]);
    const plugin = balancer.plugin();
    request.get('https://www.baidu.com/')
      .use(plugin)
      .then((res) => {
        assert.equal(res.status, 200);
        done();
      }).catch(done);
  });


  it('getAvailableServers ', () => {
    const balancer = new Balancer([
      {
        host: 'localhost',
        ip: '127.0.0.1',
        port: 8086,
      },
      {
        ip: '127.0.0.1',
        port: 8086,
        backup: true,
      },
    ]);
    const serverList = balancer.getAvailableServers();
    assert.equal(serverList.length, 1);
    assert.equal(serverList[0].host, 'localhost');
  });

});
