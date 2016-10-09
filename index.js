'use strict';

var urlParse = require('url').parse;
/**
 * [pass check url is pass]
 * @param  {[type]} url [description]
 * @return {[type]}     [description]
 */
function pass(url) {
  if (url[0] !== '/') {
    return true;
  }
  return false;
}

/**
 * [getUrl get request url]
 * @param  {[type]} backend [description]
 * @param  {[type]} url     [description]
 * @return {[type]}         [description]
 */
function getUrl(backend, url) {
  var arr = [];
  arr.push(backend.protocol || 'http');
  arr.push('://');
  arr.push(backend.ip || backend.host);
  if (backend.port) {
    arr.push(':' + backend.port);
  }
  arr.push(url);
  return arr.join('');
}

/**
 * [getBalanceHandler get balance]
 * @param  {[type]} type [balance algorithm:round-robin, uri, leastconn]
 * @return {[type]}      [description]
 */
function getBalanceHandler(type) {
  var roundRobinIndex = 0;
  var fn;
  var getByRoundRobin = function getByRoundRobin(backends) {
    var backend;
    var count = 0;
    var firstAvailableBackend;
    backends.forEach(function countWeight(item) {
      if (item.disabled) {
        return;
      }
      count += (item.weight || 1);
      // 由于可能本来命中的backend刚好disabled, 确保backend有选中一个可用的
      if (!firstAvailableBackend) {
        firstAvailableBackend = item;
      }
      if (!backend && roundRobinIndex < count) {
        backend = item;
      }
    });
    roundRobinIndex += 1;
    backend = backend || firstAvailableBackend;
    if (roundRobinIndex >= count) {
      roundRobinIndex = 0;
    }
    return backend;
  };

  var getByUrl = function getByUrl(backends, url) {
    var arr = [];
    var i = 0;
    backends.forEach(function filterBackend(item) {
      if (!item.disabled) {
        arr.push(item);
      }
    });
    i = url.length % arr.length;
    return arr[i];
  };

  var getByUrlPath = function getByUrlPath(backends, url) {
    var urlInfos = urlParse(url);
    return getByUrl(backends, urlInfos.pathname);
  };

  var getByLeastconn = function getByLeastconn(backends) {
    var backend;
    var max = Number.MAX_VALUE;
    backends.forEach(function leastconn(item) {
      var conn = item.conn || 0;
      if (item.disabled) {
        return;
      }
      if (conn < max) {
        backend = item;
        max = conn;
      }
    });
    return backend;
  };

  var getByFirst = function getByFirst(backends) {
    var backend;
    backends.forEach(function first(item) {
      if (!backend && !item.disabled) {
        backend = item;
      }
    });
    return backend;
  };

  switch (type) {
    case 'url':
      fn = getByUrl;
      break;
    case 'leastconn':
      fn = getByLeastconn;
      break;
    case 'first':
      fn = getByFirst;
      break;
    case 'url-path':
      fn = getByUrlPath;
      break;
    default:
      fn = getByRoundRobin;
  }
  return fn;
}

function isFunction(fn) {
  return typeof fn === 'function';
}

function loadBalancer(backends, type) {
  var baclanceHaldner = isFunction(type) ? type : getBalanceHandler(type);
  return function addHost(request) {
    var self = request;
    var url = self.url;
    // select backend
    var backend;
    // request complete call back
    var complete;
    if (pass(url)) {
      return self;
    }
    backend = baclanceHaldner(backends, url);
    if (!backend) {
      throw new Error('There is no server available');
    }
    self.backend = backend;
    // request url by ip addresss, so set http host header
    if (backend.ip && backend.host) {
      self.set('Host', backend.host);
    }
    url = getUrl(backend, url);
    self.url = url;

    if (type === 'leastconn') {
      backend.conn = (backend.conn || 0) + 1;
      complete = function completeRequest() {
        backend.conn -= 1;
        self.removeListener('error', complete);
        self.removeListener('response', complete);
      };
      self.once('response', complete);
      self.once('error', complete);
    }
    return self;
  };
}

function check(backend, ping) {
  var item = backend;
  var cb = function pingCb(err) {
    if (err) {
      item.disabled = true;
    } else {
      item.disabled = false;
    }
  };
  var result = ping(item, cb);
  if (result && result.then) {
    result.then(function resolve() {
      cb();
    }, cb);
  }
}

function healthCheck(backends, options) {
  var interval;
  if (!options || !options.ping || !isFunction(options.ping)) {
    throw new Error('options can not be null and ping must be a function');
  }
  interval = options.interval || 1000;
  return setInterval(function intervalCheck() {
    backends.forEach(function eachCheck(backend) {
      check(backend, options.ping, interval);
    });
  }, interval).unref();
}

exports.get = loadBalancer;
exports.healthCheck = healthCheck;
