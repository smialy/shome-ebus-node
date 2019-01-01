import commander from 'commander';

import pkg from '../package.json';
// import * as ui from './ui';
// import * as consts from './consts';
import * as commands from './commands'
import { setupExceptionHandler } from './utils/errors';

    
commander.command('start')
    .option('--host <host>', 'metric exporter host', 'localhost')
    .option('--port <port>', 'metric exporter port', 9091)
    .option('--ebus-host <host>', 'ebus service host', 'localhost')
    .option('--ebus-port <port>', 'ebus service port', 8888)
    
    // .option('--wamp-url <url>', 'wamp server url', 'ws://localhost:8080/ws')
    // .option('--wamp-realm <realm>', 'wamp server realm', 'shome')
    .action(options => {
        const { ebusPort, ebusHost, host, port } = options;
        commands.start({
            server: {
                host,
                port,
            },
            ebus: {
                host: ebusHost,
                port: ebusPort,
            }
        });
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