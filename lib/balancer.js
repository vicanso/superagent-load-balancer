'use strict';

const crc = require('crc');
const EventEmitter = require('events');
const urlParse = require('url').parse;

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
  /* istanbul ignore else */
  if (backend.port) {
    arr.push(`:${backend.port}`);
  }
  arr.push(url);
  return arr.join('');
}

function isFunction(fn) {
  return typeof fn === 'function';
}

class Balancer extends EventEmitter {
  constructor(backends, type) {
    super();
    this.chooser = new Servers(backends);
    this.type = type;
    this.customAlgorithms = {};
  }
  /**
   * Get the backend for backend list
   * @param  {[type]} request [description]
   * @return {[type]}         [description]
   */
  getBackend(request) {
    const type = this.type;
    const chooser = this.chooser;
    const url = request.url;
    const fn = this.customAlgorithms[type];
    let backend = null;
    if (fn) {
      return this.chooser.getByIndex(fn(request));
    }
    switch (type) {
      case 'url':
        backend = chooser.getByIndex(crc.crc32(url));
        break;
      case 'first':
        backend = chooser.getByIndex(0);
        break;
      case 'url-path':
        backend = chooser.getByIndex(crc.crc32(urlParse(url).pathname));
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
  /**
   * Start the health heack for backend list
   * @param  {Object} options - {ping: function, interval: ms}
   * @return {[type]}         [description]
   */
  startHealthCheck(options) {
    const chooser = this.chooser;
    const servers = chooser.servers.map(item => Object.assign({}, item));
    /* istanbul ignore if */
    if (!options || !options.ping || !isFunction(options.ping)) {
      throw new Error('options can not be null and ping must be a function');
    }
    const interval = options.interval || 5000;
    const ping = options.ping;
    const max = options.window || 5;
    const threshold = options.threshold || 3;
    const check = (server) => {
      const fns = [];
      for (let i = 0; i < max; i += 1) {
        fns.push(new Promise((resolve) => {
          ping(server).then(() => {
            resolve(true);
          }, () => {
            resolve(false);
          });
        }));
      }
      return Promise.all(fns).then((result) => {
        let healthCount = 0;
        result.forEach((item) => {
          if (item) {
            healthCount += 1;
          }
        });
        if (healthCount >= threshold) {
          return true;
        }
        throw new Error(`The server:${server.id} is fail`);
      });
    };
    const checkAll = () => {
      servers.forEach((item) => {
        check(item).then(() => {
          this.emit('healthy', Object.assign(item));
          chooser.enable(item.id);
        }, () => {
          this.emit('sick', Object.assign(item));
          chooser.disable(item.id);
        });
      });
    };
    checkAll();
    return setInterval(checkAll, interval);
  }
  /**
   * Get the plugin function for superagent use
   * @return {Function} [description]
   */
  plugin() {
    const chooser = this.chooser;
    return (request) => {
      const url = request.url;
      if (pass(url)) {
        return request;
      }
      const backend = this.getBackend(request);
      /* istanbul ignore if */
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
        chooser.increase(id);
        const complete = () => {
          chooser.decrease(id);
          request.removeListener('error', complete);
          request.removeListener('response', complete);
        };
        request.on('response', complete);
        request.on('error', complete);
      }
      return request;
    };
  }
  /**
   * Get the available server list
   * @return {[type]} [description]
   */
  getAvailableServers() {
    return this.chooser.getAvailableServers();
  }
  /**
   * Add load balancing algorithm
   * @return {Integer} return the index of backend selected
   */
  addAlgorithm(name, fn) {
    if (!name || !isFunction(fn)) {
      throw new Error('name can\'t be null and fn should be a function');
    }
    this.customAlgorithms[name] = fn;
    return this;
  }
}

module.exports = Balancer;
