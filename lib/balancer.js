'use strict';

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
  /* istanbul ignore else */
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
  /**
   * Get the backend for backend list
   * @param  {[type]} url [description]
   * @return {[type]}     [description]
   */
  getBackend(url) {
    const type = this.type;
    const chooser = this.chooser;
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
  /**
   * Start the health heack for backend list
   * @param  {Object} options - {ping: function, interval: ms}
   * @return {[type]}         [description]
   */
  startHealthCheck(options) {
    const chooser = this.chooser;
    const servers = chooser.servers.map(item => Object.assign({}, item));
    /* istanbul ignore if */
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
      const backend = this.getBackend(url);
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
}

module.exports = Balancer;
