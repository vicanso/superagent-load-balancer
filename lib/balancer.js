const urlParse = require('url').parse;
const util = require('util');

const Servers = require('./servers');

function pass(url) {
  if (url[0] !== '/') {
    return true;
  }
  return false;
}

function getUrl(backend, url) {
  const arr = [];
  arr.push(backend.protocol || 'http');
  arr.push('://');
  arr.push(backend.ip || backend.host);
  if (backend.port) {
    arr.push(`:${backend.port}`);
  }
  arr.push(url);
  return arr.join('');
}

class Balancer {
  constructor(backends, type) {
    this.chooser = new Servers(backends);
    this.type = type;
  }
  getBackend(url) {
    const {
      type,
      chooser,
    } = this;
    let backend = null;
    switch (type) {
      case 'url':
        backend = chooser.getByIndex(url.length);
        break;
      case 'first':
        backend = chooser.getByIndex(0);
        break;
      case 'url-path':
        backend = chooser.getByIndex(urlParse(url).pathname.length);
        break;
      case 'leastconn':
        backend = chooser.getByLeastCount();
        break;
      default:
        backend = chooser.getByRoundRobin();
        break;
    }
    return backend;
  }
  increaseConn(id) {
    return this.chooser.increase(id);
  }
  decreaseConn(id) {
    return this.chooser.decrease(id);
  }
  startHealthCheck(options) {
    const chooser = this.chooser;
    const servers = chooser.servers.map(item => Object.assign({}, item));
    if (!options || !options.ping || !util.isFunction(options.ping)) {
      throw new Error('options can not be null and ping must be a function');
    }
    const interval = options.interval || 1000;
    const ping = options.ping;
    return setInterval(() => {
      servers.forEach((item) => {
        ping(item).then(() => {
          chooser.enable(item.id);
        }, () => {
          chooser.disable(item.id);
        });
      });
    }, interval);
  }
  plugin() {
    return (request) => {
      const url = request.url;
      if (pass(url)) {
        return request;
      }
      const backend = this.getBackend(url);
      if (!backend) {
        throw new Error('There is no server available');
      }
      request.backendServer = backend;
      if (backend.ip && backend.host) {
        request.set('Host', backend.host);
      }
      const requestUrl = getUrl(backend, url);
      /* eslint no-param-reassign:0 */
      request.url = requestUrl;
      if (this.type === 'leastconn') {
        const id = backend.id;
        this.increaseConn(id);
        const complete = () => {
          this.decreaseConn(id);
          request.removeListener('error', complete);
          request.removeListener('response', complete);
        };
        request.on('response', complete);
        request.on('error', complete);
      }
      return request;
    };
  }
}

module.exports = Balancer;
