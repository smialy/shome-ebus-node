import commander from 'commander';

import pkg from '../package.json';
// import * as ui from './ui';
// import * as consts from './consts';
import * as commands from './commands'
import { setupExceptionHandler } from './utils/errors';

    
commander.command('start')
    .option('--ebus-host <host>', 'server host', 'localhost')
    .option('--ebus-port <port>', 'server port', 8888)
    .action(({ ebusPort, ebusHost }) => {
        commands.start({ ebusPort, ebusHost });
    });

commander.command('info')
    .option('--ebus-host <host>', 'server host', 'localhost')
    .option('--ebus-port <port>', 'server port', 8888)
    .action((options) => {
        console.log(config);
        commands.info(options);
    });


commander.version(pkg.version)
    .usage('[cmd]');


(function run(){
    setupExceptionHandler();
    commander.parse(process.argv);
    if (process.argv.length == 2) {
      commander.outputHelp();
    }
})();