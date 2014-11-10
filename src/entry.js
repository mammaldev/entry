var Q = require('q');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
require('colors');

// List of colors available to differentiate between processes. Some are
// excluded as they are used for our own logging. Colors are provided by
// https://www.npmjs.org/package/colors
var CHILD_COLORS = [
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'grey'
];

// Standard streams to listen on for each spawned child process.
var CHILD_STD_STREAMS = [
  'stdout',
  'stderr'
];

var completed = [];

module.exports = function entry(childProcesses, env) {

  // Validate the config file entries. If any are invalid we can't continue.
  var error = validateConfig(childProcesses);
  if ( error ) {
    throw new Error('Error: ' + error);
  }

  setEnv(env)
  .then(spawnProcesses.bind(null, childProcesses))
  .then(pipeStdIn.bind(null, childProcesses))
  .fail(function ( err ) {
    console.error(('Error: ' +  err.message).red);
  });
};

//
// Sets up the environment variables as specified by the provided .env file (if
// any)
//
function setEnv(env) {
  var deferred = Q.defer();

  if ( !env ) {

    // If no .env file was specified we don't need to do anything else.
    deferred.resolve();
  } else {

    // Source the environment and output the result to stdout so we can pass
    // environment variables into child processes.
    exec('source ' + env + ' && printenv', {
      cwd: env.replace(/\/.*/, '')
    }, function ( err, stdout ) {

      if ( err ) {
        throw new Error(err);
      }

      // The stdout output is expected to be in the following format:
      //
      //   ENV_VAR=value
      //
      // We take the names and values and add them to the environment of this
      // process
      stdout.split('\n').forEach(function ( line ) {
        var parts = line.split('=');
        process.env[ parts[0] ] = parts[1];
      });

      deferred.resolve();
    });
  }

  return deferred.promise;
}

//
// Checks that a given command is available on the system
//
// Arguments:
//   cp    {String}    The command to check
//
function commandExists( cp ) {

  var deferred = Q.defer();

  // Check that the given command exists. The stdout from `command` is
  // surpressed and stderr is redirected to stdout. In the event the command
  // does not exist we also output to stdout. This means any output to stdout
  // represents an error.
  exec('command -v ' + cp.spawn.command + ' >/dev/null 2>&1 || { echo >&2; exit 1; }', function ( error ) {

    if (error !== null) {
      deferred.reject(new Error('Command ' + cp.spawn.command + ' for handle ' + cp.handle + ' does not exist'));
    }

    deferred.resolve();
  });

  return deferred.promise;
}

//
// Spawn a child process, given a command and any arguments
//
// Arguments:
//   cp       {Object}    An Entry Spawn definition
//   color    {String}    The color to use for stdout logs from the process
//
function spawnProcess( cp, color, childProcesses ) {

  // check to see if the command exists
  return commandExists(cp)
  .then(function () {

    var deferred = Q.defer();

    // Spawn the child process passing in any relevant arguments/options.
    cp.process = spawn(cp.spawn.command, cp.spawn.args);

    // Bind listeners to the relevant standard streams of the child process.
    // All output is written to our own stdout.
    CHILD_STD_STREAMS.forEach(function ( str ) {

      cp.process[ str ]
      .on('data', function ( data ) {

        // Print output in the processes own unique color and in the following
        // format:
        //
        //   Handle: process output
        //
        process[ str ].write(
          data.toString('utf8')
          .replace(/(^|\n)([^\n]+)/g, function ( match, group1, group2 ) {
            return group1 + ( cp.handle + ': ' )[ color ] + group2;
          })
        );
      })
      .on('close', function () {

        if ( completed.indexOf(cp.handle) < 0 ) {

          // Record the fact that this process has now finished. If other
          // processes depend on it they can now run.
          completed.push(cp.handle);
          process.stdout.write('------------------\n'[ color ]);
          process.stdout.write((cp.handle + ': completed\n')[ color ]);
          process.stdout.write('------------------\n'[ color ]);

          childProcesses.forEach(function ( cp2, i2 ) {
            if (cp2.hasOwnProperty('waitOn') && cp2.waitOn === cp.handle) {
              deferred.resolve(spawnProcess(cp2, i2));
            }
          });
        }
      });
    });

    return deferred.promise;
  });
}

//
// Spawn all child processes that do not depend on another. Processes that need
// to wait until another has exited will run at that point in time.
//
function spawnProcesses(childProcesses) {

  return Q.all(
    childProcesses.map(function ( cp, i ) {

      if (!cp.waitOn) {

        // We attempt to color the output from each process uniquely to make it
        // easier to read the Entry output
        var color = CHILD_COLORS[ i % CHILD_COLORS.length ];

        return spawnProcess(cp, color, childProcesses);
      }
    })
  );
}

//
// Handle user input on stdin. Inputs are prefixed with identifiers
// corresponding to child processes and are passed through to the relevant
// process.
//
function pipeStdIn(childProcesses) {

  process.stdin.resume();
  process.stdin.on('data', function ( chunk ) {

    var s = chunk.toString('utf8');

    // Find the relevant child process by its stdin prefix.
    var cp = childProcesses.filter(function ( cp ) {
      var prefix = new RegExp('^' + cp.stdinPrefix + '\\.');
      return typeof cp.stdinPrefix === 'string' && prefix.test(s);
    })[ 0 ];

    if ( !cp ) {
      return console.error('No target for input'.red);
    }

    // Parse the command out from the input and write it to the relevant child
    // process stdin stream.
    var cmd = s.substring(cp.stdinPrefix.length + 1);
    cp.process.stdin.write(cmd);
  });
}

//
// Validate the Entry config file. The expected format is as follows:
//
//   [
//     {
//        "handle": "example",
//        "spawn": {
//          "command": "something",
//          "args": [ "x", "y" ]
//        },
//        "stdinPrefix": "ex"
//     },
//     ...
//   ]
//
// The stdinPrefix and spawn.args properties are optional.
//
function validateConfig( config ) {

  var handles = [];
  var stdinPrefixes = [];

  for (var i = 0; i < config.length; i++) {

    var item = config[i];

    // handle exists
    if ( !item.handle || !item.handle.length ) {
      return 'Entry ' + i + ' has no handle. Handles are required.';
    }

    // handle is unique
    if ( !!~handles.indexOf(item.handle) ) {
      return item.handle + ' has already been used as a handle.';
    }

    // command exists
    if ( !item.spawn || !item.spawn.command || !item.spawn.command.length ) {
      return item.handle + ' has no command. Commands are required.';
    }

    // if there is a waitOn property, it waits on a handle that exists
    if ( item.waitOn && !~handles.indexOf(item.waitOn) ) {
      return item.handle + ' waits on ' + item.waitOn + ' which does not exist prior to it.';
    }

    // stdinPrefix is unique
    if ( item.stdinPrefix && !!~stdinPrefixes.indexOf(item.stdinPrefix) ) {
      return item.stdinPrefix + ' has already been used as a stdinPrefix.';
    }

    handles.push(item.handle);
    stdinPrefixes.push(item.stdinPrefix);
  }
}
