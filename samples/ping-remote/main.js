/**
 * @module ping-remote main
 * Fork two actors into two containers to play ping pong.
 */

var proc = require('child_process');

proc.fork(__dirname + '/launcher1');
proc.fork(__dirname + '/launcher2');
