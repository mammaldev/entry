var stubRequire = require('proxyquire');
var chai = require('chai');
var expect = chai.expect;

function validExecStub(cmd, opts, cb) {
  return typeof opts === 'function' ? opts(null, '') : cb(null, '');
}

function invalidExecStub(cmd, opts, cb) {
  return typeof opts === 'function' ? opts(new Error()) : cb(new Error());
}

function validSpawnStub(cmd, args, opts) {
  return {
    stdout: {
      on: function () {
        return this;
      }
    },
    stderr: {
      on: function () {
        return this;
      }
    }
  };
}

var childProcessStub = {};


describe('Configuration validation', function () {

  childProcessStub.exec = validExecStub;
  childProcessStub.spawn = validSpawnStub;

  var entry = stubRequire('../src/entry', {
    /*jshint camelcase: false */
    child_process: childProcessStub
  });

  it('should enforce the presence of a handle for every item', function () {
    function test() {
      entry([
        {
          spawn: {
            command: 'thing'
          }
        }
      ]);
    }
    expect(test).to.throw(Error, /has no handle/);
  });

  it('should enforce uniqueness of handles', function () {
    function test() {
      entry([
        {
          handle: 'thing',
          spawn: {
            command: 'thing'
          }
        },
        {
          handle: 'thing',
          spawn: {
            command: 'thing'
          }
        }
      ]);
    }
    expect(test).to.throw(Error, /already been used as a handle/);
  });

  it('should enforce the presence of a "spawn" property for every item', function () {
    function test() {
      entry([
        {
          handle: 'thing'
        }
      ]);
    }
    expect(test).to.throw(Error, /has no command/);
  });

  it('should enforce the presence of a command for every item', function () {
    function test() {
      entry([
        {
          handle: 'thing',
          spawn: {}
        }
      ]);
    }
    expect(test).to.throw(Error, /has no command/);
  });

  it('should ensure waitOn values exist as handles prior to the item', function () {
    function test() {
      entry([
        {
          handle: 'thing',
          spawn: {
            command: 'thing'
          },
          waitOn: 'other'
        }
      ]);
    }
    expect(test).to.throw(Error, /does not exist prior to it/);

    function test2() {
      entry([
        {
          handle: 'thing',
          spawn: {
            command: 'thing'
          },
          waitOn: 'other'
        },
        {
          handle: 'other',
          spawn: {
            command: 'other'
          }
        }
      ]);
    }
    expect(test2).to.throw(Error, /does not exist prior to it/);
  });

  it('should enforce uniqueness of stdinPrefix values', function () {
    function test() {
      entry([
        {
          handle: 'thing',
          spawn: {
            command: 'thing'
          },
          stdinPrefix: 'thing'
        },
        {
          handle: 'other',
          spawn: {
            command: 'other'
          },
          stdinPrefix: 'thing'
        }
      ]);
    }
    expect(test).to.throw(Error, /already been used as a stdinPrefix/);
  });

  it('should accept a valid configuration', function () {
    function test() {
      entry([
        {
          handle: 'Configuration validation test',
          spawn: {
            command: 'echo',
            args: [ '\ntest echo' ]
          }
        }
      ]);
    }
    expect(test).not.to.throw(Error);
  });
});
