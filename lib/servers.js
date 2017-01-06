const util = require('util');
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
    if (!util.isArray(servers) || !servers.length) {
      throw new Error('The servers param should be array and not empty');
    }
    this.servers = servers.map((item) => {
      const id = crypto.randomBytes(8).toString('hex');
      return Object.assign({
        id,
      }, item);
    });
    this.options = Object.assign({
      roundRobinIndex: 0,
    }, this.getOptions());
  }
  getOptions() {
    const availableServers = this.servers.filter(item => item.status !== 'disabled');
    let maxWeight = 0;
    availableServers.forEach((item) => {
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
    const {
      roundRobinIndex,
      availableServers,
      maxWeight,
    } = this.options;
    if (!availableServers.length) {
      return null;
    }
    let count = 0;
    let found = null;
    const index = roundRobinIndex % maxWeight;
    availableServers.forEach((item) => {
      count += (item.weight || 1);
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
    const {
      availableServers,
    } = this.options;
    if (!availableServers.length) {
      return null;
    }
    return availableServers[index % availableServers.length];
  }
  /**
   * Get the server by least count
   * @return {[type]} [description]
   */
  getByLeastCount() {
    const {
      availableServers,
    } = this.options;
    if (!availableServers.length) {
      return null;
    }
    let found = null;
    let minCount = Number.MAX_SAFE_INTEGER;
    const ids = availableServers.map(item => item.id);
    this.servers.forEach((item) => {
      if (ids.indexOf(item.id) === -1) {
        return;
      }
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
    if (!found) {
      return false;
    }
    found.status = status;
    const options = this.options;
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
