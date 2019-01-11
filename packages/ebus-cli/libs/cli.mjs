import commander from 'commander';

import pkg from '../package.json';
import * as commands from './commands'

commander.command('find [device]')
    .option('--host <host>', 'metric exporter host', 'localhost')
    .option('--port <port>', 'metric exporter port', 8888)
    .action(async (device, options) => {
        await commands.find(device, options);
    });


commander.command('read-all <device>')
    .option('--host <host>', 'metric exporter host', 'localhost')
    .option('--port <port>', 'metric exporter port', 8888)
    .option('--format <format>', 'metric exporter port',  /^(json|stdout)$/i ,'stdout')
    .action(async (device, options) => {
        await commands.readAll(device, options);
    });

commander.version(pkg.version)
    .usage('[cmd]');

commander.command('*')
    .action(name => {
        console.log(`Not found command: "${name}"`);
    });

(function run(){
    commander.parse(process.argv);
    if (process.argv.length == 2) {
      commander.outputHelp();
    }
})();