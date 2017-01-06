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

    assert.equal(balancer.getBackend('/users/me').ip, '192.168.1.2');
    assert.equal(balancer.getBackend('/users/me?').ip, '127.0.0.1');
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

    assert.equal(balancer.getBackend('/users/me').ip, '192.168.1.2');
    assert.equal(balancer.getBackend('/users/me?cache=false').ip, '192.168.1.2');

    assert.equal(balancer.getBackend('/users?cache=false').ip, '127.0.0.1');
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
    let backend = balancer.getBackend('/users/me');
    assert.equal(backend.ip, '127.0.0.1');
    balancer.increaseConn(backend.id);
    assert.equal(balancer.getBackend('/users/me').ip, '192.168.1.2');
    balancer.decreaseConn(backend.id);
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
      interval: 30,
    }).unref();
    setTimeout(() => {
      assert.equal(balancer.getBackend('/users/me').ip, '127.0.0.1');
      assert.equal(balancer.getBackend('/users/me').ip, '127.0.0.1');
      assert.equal(balancer.getBackend('/users/me').ip, '127.0.0.1');
      done();
    }, 100).unref();
  });


  it('get baidu.com by balancer', (done) => {
    const balancer = new Balancer([
      {
        host: 'www.baidu.com',
        ip: '123.125.114.144',
      },
      {
        host: 'www.baidu.com',
        protocol: 'https',
      },
    ]);
    const plugin = balancer.plugin();
    request.get('/')
      .use(plugin)
      .then((res) => {
        assert.equal(res.request.backendServer.ip, '123.125.114.144');
        assert(res.text.indexOf('http://www.baidu.com/') !== -1);
        assert(res.text);
        return request.get('/').use(plugin);
      }).then((res) => {
        assert.equal(res.request.backendServer.host, 'www.baidu.com');
        assert(res.text.indexOf('https') !== -1);
        done();
      }).catch(done);
  });

});