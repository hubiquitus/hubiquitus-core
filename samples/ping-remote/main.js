/**
 * @module ping-ipc main
 */

var proc = require('child_process');

proc.fork(__dirname + '/launcher1');
proc.fork(__dirname + '/launcher2');
