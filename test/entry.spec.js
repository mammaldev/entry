var MockStream = require('mock-utf8-stream');
var stubRequire = require('proxyquire');
var mockSpawn = require('mock-spawn');
var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");

var expect = chai.expect;
chai.use(chaiAsPromised);

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
    return expect(
      entry([
        {
          spawn: {
            command: 'thing'
          }
        }
      ])
    ).to.eventually.be.rejectedWith(Error, /has no handle/);
  });

  it('should enforce uniqueness of handles', function () {
    return expect(
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
      ])
    ).to.eventually.be.rejectedWith(Error, /already been used as a handle/);
  });

  it('should enforce the presence of a "spawn" property for every item', function () {
    return expect(
      entry([
        {
          handle: 'thing'
        }
      ])
    ).to.eventually.be.rejectedWith(Error, /has no command/);
  });

  it('should enforce the presence of a command for every item', function () {
    return expect(
      entry([
        {
          handle: 'thing',
          spawn: {}
        }
      ])
    ).to.eventually.be.rejectedWith(Error, /has no command/);
  });

  it('should ensure waitOn values exist as handles prior to the item', function () {
    // no return here as we notify done
    return expect(
      entry([
        {
          handle: 'thing',
          spawn: {
            command: 'thing'
          },
          waitOn: 'other'
        }
      ])
    ).to.eventually.be.rejectedWith(Error, /does not exist prior to it/);
  });

  it('should ensure waitOn values exist as handles prior to the item', function () {
    return expect(
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
      ])
    ).to.eventually.be.rejectedWith(Error, /does not exist prior to it/);
  });

  it('should enforce uniqueness of stdinPrefix values', function () {
    return expect(
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
      ])
    ).to.eventually.be.rejectedWith(Error, /already been used as a stdinPrefix/);
  });

  it('should accept a valid configuration', function () {
    return expect(
      entry([
        {
          handle: 'Configuration validation test',
          spawn: {
            command: 'echo',
            args: [ '\ntest echo' ]
          }
        }
      ], null, mockedStreams)
    ).to.eventually.be.resolved;
  });
});

describe('Output', function () {

  it('should relay child stdout streams to this process', function ( done ) {
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
