'use strict';

const crypto = require('crypto');

class Servers {
  /**
   * Create a server chooser for balance algorithm
   * @param  {Array} servers - [{
   *   name: 'xxxxx', //optional
   *   host: 'domain.com',
   *   ip: '192.168.1.1',  // optional
   *   port: 8080, // optional, default is 80
   *   weight: 10, // optional, default is 1
   * }]
   * @return {Servers}
   */
  constructor(servers) {
    /* istanbul ignore if */
    if (!Array.isArray(servers) || !servers.length) {
      throw new Error('The servers param should be array and not empty');
    }
    this.servers = servers.map((item) => {
      // set the id for backend server
      const id = crypto.randomBytes(8).toString('hex');
      return Object.assign({
        id,
      }, item);
    });
    this.options = Object.assign({
      // the index of round robin
      roundRobinIndex: 0,
    }, this.getOptions());
  }
  /**
   * Get the options for servers,
   * when there is a backend server status change,
   * it should call to update the options
   * @return {[type]} [description]
   */
  getOptions() {
    let availableServers = this.servers.filter(item => item.status !== 'disabled' && !item.backup);
    let maxWeight = 0;
    if (!availableServers.length) {
      availableServers = this.servers.filter(item => item.status !== 'disabled');
    }
    availableServers.forEach((item) => {
      // sum the backend weight, it for round robin
      maxWeight += (item.weight || 1);
    });
    return {
      availableServers,
      maxWeight,
    };
  }
  /**
   * getAvailableServers Get the available server list
   * @return {Array} The available server list
   */
  getAvailableServers() {
    return this.options.availableServers.map(item => Object.assign({}, item));
  }
  /**
   * getByRoundRobin Get the server by round-robin (can set the weight of server)
   * @return {Object} {id: String, host: String, port: Number, name: String}
   */
  getByRoundRobin() {
    const options = this.options;
    const roundRobinIndex = options.roundRobinIndex;
    const availableServers = options.availableServers;
    const maxWeight = options.maxWeight;
    /* istanbul ignore if */
    if (!availableServers.length) {
      return null;
    }
    let count = 0;
    let found = null;
    const index = roundRobinIndex % maxWeight;
    availableServers.forEach((item) => {
      count += (item.weight || 1);
      // if the round robin index is less than weight count
      // the backend will be selected
      if (!found && index < count) {
        found = Object.assign({}, item);
      }
    });
    this.options.roundRobinIndex = index + 1;
    return found;
  }
  /**
   * Get the server by index
   * @param  {Number} index [description]
   * @return {Object}       [description]
   */
  getByIndex(index) {
    const availableServers = this.options.availableServers;
    /* istanbul ignore if */
    if (!availableServers.length) {
      return null;
    }
    // get the server by index(mod)
    return availableServers[index % availableServers.length];
  }
  /**
   * Get the server by least count
   * @return {[type]} [description]
   */
  getByLeastCount() {
    const availableServers = this.options.availableServers;
    /* istanbul ignore if */
    if (!availableServers.length) {
      return null;
    }
    let found = null;
    let minCount = Number.MAX_SAFE_INTEGER;
    availableServers.forEach((item) => {
      const count = item.count || 0;
      if (count < minCount) {
        found = Object.assign({}, item);
        minCount = count;
      }
    });
    return found;
  }
  /**
   * disable the server
   * @param  {String} id The id of server
   * @return {Boolean}
   */
  disable(id) {
    return this.setStauts(id, 'disabled');
  }
  /**
   * enable the server
   * @param  {String} id The id of server
   * @return {Boolean}
   */
  enable(id) {
    return this.setStauts(id, 'enabled');
  }
  /**
   * Set the disabled status for server
   * @param {String} id - The id of server
   * @param {String} status - The status of server
   */
  setStauts(id, status) {
    const found = this.servers.find(item => item.id === id);
    /* istanbul ignore if */
    if (!found) {
      return false;
    }
    found.status = status;
    const options = this.options;
    // update the options
    this.options = Object.assign(options, this.getOptions());
    return true;
  }
  /**
   * Increase the count of server
   * @param  {String} id - The id of server
   * @param  {Number} count [description]
   * @return {[type]}       [description]
   */
  increase(id, count) {
    return this.changeCount(id, count || 1);
  }
  /**
   * Decrease the count of server
   * @param  {String} id - The id of server
   * @param  {Number} count [description]
   * @return {[type]}       [description]
   */
  decrease(id, count) {
    return this.changeCount(id, count || -1);
  }
  changeCount(id, count) {
    const found = this.servers.find(item => item.id === id);
    /* istanbul ignore if */
    if (!found) {
      return false;
    }
    if (!found.count) {
      found.count = 0;
    }
    found.count += count;
    return true;
  }
}

module.exports = Servers;
