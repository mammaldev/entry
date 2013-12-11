#!/usr/bin/env node
var spawn = require('child_process').spawn;
var colors = require('colors');
var findup = require('findup-sync');

var available_colors = [
  'yellow',
  'cyan',
  'white',
  'magenta',
  'grey',
  'blue'
];
 
// app-specific config
var childProcesses = findup('entry.json');
 
if (!childProcesses) {
  console.log('Unable to find local entry.json');
  console.log('');
  process.exit(99);
}

childProcesses = require(childProcesses);

// generic stdout & stderr
childProcesses.forEach(function( cp, i ) {
  cp.process = spawn(cp.spawn.command, cp.spawn.args);
 
  [ 'stdout', 'stderr' ].forEach(function( str ) {
    cp.process[ str ].on('data', function( data ) {
      process[ str ].write(
          data.toString('utf8')
          .replace(/(^|\n)([^\n]+)/g, function( match, group1, group2 ) {
            return group1 + ( cp.handle + ': ' )[available_colors[i % available_colors.length]] + group2;
          }));
    });
  });
});
 
// generic stdin handling
process.stdin.resume();
process.stdin.on('data', function( chunk ) {
  var s = chunk.toString('utf8');
  var cp = childProcesses.filter(function( cp ) {
    return typeof cp.stdinPrefix === 'string' && ( new RegExp('^' + cp.stdinPrefix + '\\.') ).test(s);
  })[ 0 ];
 
  if ( !cp ) {
    return console.log(('No target for input').red);
  }
 
  var cmd = s.substring(cp.stdinPrefix.length + 1);
  cp.process.stdin.write(cmd);
});