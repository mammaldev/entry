var MockStream = require('mock-utf8-stream');
var stubRequire = require('proxyquire');
var mockSpawn = require('mock-spawn');
var chai = require('chai');
var expect = chai.expect;

// A simple mock for child_process.exec that just immediately calls the
// callback with an empty string and no error.
function validExecStub(cmd, opts, cb) {
  return typeof opts === 'function' ? opts(null, '') : cb(null, '');
}

// Mock the child_process.spawn method.
var mockedSpawn = mockSpawn();
mockedSpawn.setStrategy(function (cmd) {
  switch (cmd) {
  case 'thing':
    return function (cb) {
      this.stdout.write('stdout data');
      return cb(0);
    };
  }
  return null;
});

// Setup the mocks and import the main script with them.
var childProcessStub = {
  exec: validExecStub,
  spawn: mockedSpawn
};

var entry = stubRequire('../src/entry', {
  /*jshint camelcase: false */
  child_process: childProcessStub
  /*jshint camelcase: true */
});

// Mock the standard streams and start capturing data written to them.
var mockedStreams;
beforeEach(function () {
  mockedStreams = {
    stdout: new MockStream.MockWritableStream(),
    stderr: new MockStream.MockWritableStream()
  };
  mockedStreams.stdout.startCapture();
});

describe('Configuration validation', function () {

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
      ], null, mockedStreams);
    }
    expect(test).not.to.throw(Error);
  });
});

describe('Output', function () {

  it('should relay child stdout streams to this process', function (done) {
    entry([
      {
        handle: 'thing',
        spawn: {
          command: 'thing'
        }
      }
    ], null, mockedStreams)
    .then(function () {
      setTimeout(function () {
        expect(mockedStreams.stdout.capturedData).to.contain('completed');
        done();
      }, 0);
    });
  });
});
