const assert = require('assert');

const Servers = require('../lib/servers');

describe('Servers Chooser', () => {
  it('get server by round-robin', () => {
    const serverList = [
      {
        name: 'localhost',
        ip: '127.0.0.1',
        port: 8086,
      },
      {
        name: 'en0',
        ip: '192.168.1.1',
        port: 8086,
      },
    ];
    const chooser = new Servers(serverList);
    serverList.forEach((item) => {
      const server = chooser.getByRoundRobin();
      assert.equal(server.name, item.name);
    });
  });

  it('get server by round-robin with weight', () => {
    const serverWeightList = [
      {
        name: 'localhost',
        ip: '127.0.0.1',
        port: 8086,
        weight: 2,
      },
      {
        name: 'en0',
        ip: '192.168.1.1',
        port: 8086,
        weight: 1,
      },
    ];
    const chooser = new Servers(serverWeightList);
    for (let i = 0; i < 6; i++) {
      const server = chooser.getByRoundRobin();
      const index = i % 3;
      if (index < 2) {
        assert.equal(server.name, serverWeightList[0].name);
      } else {
        assert.equal(server.name, serverWeightList[1].name);
      }
    }
  });

  it('get server by round-robin and one is disabled', () => {
    const serverWeightList = [
      {
        name: 'localhost',
        ip: '127.0.0.1',
        port: 8086,
        weight: 2,
      },
      {
        name: 'en0',
        ip: '192.168.1.1',
        port: 8086,
        weight: 1,
      },
    ];
    const chooser = new Servers(serverWeightList);
    const availableServers = chooser.getAvailableServers();
    for (let i = 0; i < 6; i++) {
      const server = chooser.getByRoundRobin();
      if (i < 2) {
        assert.equal(server.name, serverWeightList[0].name);
      } else {
        chooser.disable(availableServers[0].id);
        assert.equal(server.name, serverWeightList[1].name);
      }
    }
  });

  it('get server by round-robin and one will enabled soon', () => {
    const serverWeightList = [
      {
        name: 'localhost',
        ip: '127.0.0.1',
        port: 8086,
        weight: 2,
      },
      {
        name: 'en0',
        ip: '192.168.1.1',
        port: 8086,
        weight: 1,
      },
    ];
    const chooser = new Servers(serverWeightList);
    const availableServers = chooser.getAvailableServers();
    chooser.disable(availableServers[0].id);
    for (let i = 0; i < 6; i++) {
      if (i == 2) {
        chooser.enable(availableServers[0].id);
      }
      const server = chooser.getByRoundRobin();
      if (i < 2 || i === 3) {
        assert.equal(server.name, serverWeightList[1].name);
      } else {
        assert.equal(server.name, serverWeightList[0].name);
      }
    }
  });

  it('get by index', () => {
    const serverList = [
      {
        name: 'localhost',
        ip: '127.0.0.1',
        port: 8086,
      },
      {
        name: 'en0',
        ip: '192.168.1.1',
        port: 8086,
      },
    ];

    const chooser = new Servers(serverList);
    const availableServers = chooser.getAvailableServers();
    assert.equal(chooser.getByIndex(1).name, serverList[1].name);
    assert.equal(chooser.getByIndex(2).name, serverList[0].name);
    chooser.disable(availableServers[1].id);
    assert.equal(chooser.getByIndex(1).name, serverList[0].name);
  });

  it('get by count', () => {
    const serverList = [
      {
        name: 'localhost',
        ip: '127.0.0.1',
        port: 8086,
      },
      {
        name: 'en0',
        ip: '192.168.1.1',
        port: 8086,
      },
    ];

    const chooser = new Servers(serverList);
    const availableServers = chooser.getAvailableServers();
    assert.equal(chooser.getByLeastCount().name, availableServers[0].name);
    chooser.increase(availableServers[0].id);
    assert.equal(chooser.getByLeastCount().name, availableServers[1].name);

    chooser.disable(availableServers[1].id);
    assert.equal(chooser.getByLeastCount().name, availableServers[0].name);

    chooser.enable(availableServers[1].id);
    chooser.increase(availableServers[1].id);
    assert.equal(chooser.getByLeastCount().name, availableServers[0].name);

    chooser.decrease(availableServers[1].id);
    assert.equal(chooser.getByLeastCount().name, availableServers[1].name);
  });


  it('get server with backup', () => {
    const serverList = [
      {
        name: 'localhost',
        ip: '127.0.0.1',
        port: 8086,
        backup: true,
      },
      {
        name: 'en0',
        ip: '192.168.1.1',
        port: 8086,
      },
    ];
    const chooser = new Servers(serverList);
    let availableServers = chooser.getAvailableServers();
    serverList.forEach((item) => {
      const server = chooser.getByRoundRobin();
      assert.equal(server.name, availableServers[0].name);
    });
    chooser.disable(availableServers[0].id);
    serverList.forEach((item) => {
      const server = chooser.getByRoundRobin();
      assert.equal(server.name, serverList[0].name);
    });
  });

});
