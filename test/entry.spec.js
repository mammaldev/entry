var chai = require('chai');
var expect = chai.expect;

var entry = require('../src/entry');

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
});
