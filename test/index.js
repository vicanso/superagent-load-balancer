'use strict';
var request = require('superagent');
var assert = require('assert');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var loadBalancer = require('..');
var emiter = new EventEmitter();
var mockRequest = {
  get: function(url) {
    var emiter = new EventEmitter();
    emiter.url = url;
    emiter.headers = {};
    emiter.use = function(fn) {
      fn(this);
      return this;
    };
    emiter.set = function(k, v) {
      this.headers[k] = v;
      return this;
    };
    emiter.end = function(cb) {
      var self = this;
      var url = this.url;
      var headers = this.headers;
      var delay = 10;
      if (~url.indexOf('/delay')) {
        delay = 100;
      }
      setTimeout(function() {
        var res = {
          body: {
            url: url,
            headers: headers
          }
        };
        self.emit('response', res);
        cb(null, res);
      }, delay);
    };
    return emiter;
  }
};

describe('superagent-load-balancer', function() {
  it('pass if url is not start with "/"', function(done) {
    var balancer = loadBalancer.get([{
      host: 'domain1.com'
    }, {
      host: 'domain2.com'
    }]);
    mockRequest.get('http://127.0.0.1/user')
      .use(balancer)
      .end(function(err, res) {
        if (err) {
          done(err);
        } else {
          assert.equal(res.body.url, 'http://127.0.0.1/user');
          done();
        }
      });
  });

  it('get backend by round-robin success', function(done) {
    var count = 0;
    var urlList = ['http://domain1.com/user', 'http://domain2.com:8080/user', 'http://domain1.com/user'];
    var balancer = loadBalancer.get([{
      host: 'domain1.com'
    }, {
      host: 'domain2.com',
      port: 8080
    }]);
    var getUser = function() {
      mockRequest.get('/user')
        .use(balancer)
        .end(function(err, res) {
          if (err) {
            done(err);
          } else {
            assert.equal(res.body.url, urlList.shift());
            if (!urlList.length) {
              done();
            }
          }
        });
    };
    getUser();
    getUser();
    getUser();
  });

  it('get backend by uri success', function(done) {
    var count = 0;
    var balancer = loadBalancer.get([{
      host: 'domain1.com'
    }, {
      host: 'domain2.com'
    }], 'uri');
    var complete = function() {
      count++;
      if (count === 2) {
        done();
      }
    };

    mockRequest.get('/user')
      .use(balancer)
      .end(function(err, res) {
        if (err) {
          done(err);
        } else {
          assert.equal(res.body.url, 'http://domain2.com/user');
          complete();
        }
      });
    mockRequest.get('/user1')
      .use(balancer)
      .end(function(err, res) {
        if (err) {
          done(err);
        } else {
          assert.equal(res.body.url, 'http://domain1.com/user1');
          complete();
        }
      });
  });

  it('get backend by leastconn success', function(done) {
    var count = 0;
    var balancer = loadBalancer.get([{
      host: 'domain1.com'
    }, {
      host: 'domain2.com'
    }], 'leastconn');
    var getUser = function() {
      mockRequest.get('/user')
        .use(balancer)
        .end(function(err, res) {
          if (err) {
            done(err);
          } else {
            assert.equal(res.body.url, 'http://domain2.com/user');
            count++;
            if (count < 5) {
              getUser();
            }
          }
        });
    };
    mockRequest.get('/delay')
      .use(balancer)
      .end(function(err, res) {
        if (err) {
          done(err);
        } else {
          assert.equal(res.body.url, 'http://domain1.com/delay');
          done();
        }
      });
    getUser();
  });

  it('set backend with ip attr success', function(done) {
    var balancer = loadBalancer.get([{
      host: 'domain1.com',
      ip: '192.168.2.1'
    }]);
    mockRequest.get('/user')
      .use(balancer)
      .end(function(err, res) {
        if (err) {
          done(err);
        } else {
          assert.equal(res.body.url, 'http://192.168.2.1/user');
          assert.equal(res.body.headers.Host, 'domain1.com');
          done();
        }
      });
  });

  it('use custom balancer select', function(done) {
    var count = 0;
    var complete = function() {
      count++;
      if (count === 2) {
        done();
      }
    };
    var balancer = loadBalancer.get([{
      host: 'domain1.com'
    }, {
      host: 'domain2.com'
    }], function(backends, uri) {
      return backends[backends.length - 1];
    });

    mockRequest.get('/user')
      .use(balancer)
      .end(function(err, res) {
        if (err) {
          done(err);
        } else {
          assert.equal(res.body.url, 'http://domain2.com/user');
          complete();
        }
      });

    mockRequest.get('/user1')
      .use(balancer)
      .end(function(err, res) {
        if (err) {
          done(err);
        } else {
          assert.equal(res.body.url, 'http://domain2.com/user1');
          complete();
        }
      });
  });

  it('set backend disabled', function(done) {
    var backends = [{
      host: 'domain1.com'
    }, {
      host: 'domain2.com'
    }];
    var urls = ['http://domain1.com/user', 'http://domain2.com/user'];
    var balancer = loadBalancer.get(backends);

    var count = 0;

    var getUser = function() {
      mockRequest.get('/user')
        .use(balancer)
        .end(function(err, res) {
          if (err) {
            done(err);
          } else {
            if (count < 5) {
              var index = count % backends.length;
              assert.equal(res.body.url, urls[index]);
            } else {
              assert.equal(res.body.url, urls[1]);
            }
            count++;
            if (count === 5) {
              backends[0].disabled = true;
            } else if (count === 10) {
              return done();
            }
            getUser();
          }
        });
    };
    getUser();
  });

  it('health check', function(done) {
    var backends = [{
      host: 'domain1.com'
    }, {
      host: 'domain2.com'
    }];
    loadBalancer.healthCheck(backends, {
      ping: function(backend, cb) {
        var url = 'http://' + backend.host + '/ping';
        request.get(url).timeout(10).end(cb);
      },
      interval: 10
    });

    setTimeout(function() {
      backends.forEach(function(item) {
        assert.equal(item.disabled, true);
      });
      done();
    }, 200);

  });
});