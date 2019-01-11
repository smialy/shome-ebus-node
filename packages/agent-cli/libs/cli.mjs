import commander from 'commander';

import pkg from '../package.json';
import * as commands from './commands'
import { setupExceptionHandler } from './utils/errors';


commander.command('start <nodeName>')
    .option('--host <host>', 'metric exporter host', 'localhost')
    .option('--port <port>', 'metric exporter port', 9091)
    .option('--node-fs <names>', 'node fs names', '*')
    .option('--enable-ebus', 'enable ebus service', false)
    .option('--ebus-host <host>', 'ebus service host', 'localhost')
    .option('--ebus-port <port>', 'ebus service port', 8888)
    .option('--ebus-interval <second>', 'ebus read interval', 60)
    .action((name, options) => {
        const nodeFs = options.nodeFs === '*' ? '*' : options.nodeFs.split(',');
        const config = {
            name,
            server: {
                host: options.host,
                port: options.port,
            },
            ebus: {
                enabled: !!options.enableEbus,
                host: options.ebusHost,
                port: options.ebusPort,
                interval: options.ebusInterval,
            },
            node: {
                fs: nodeFs,
            }
        };
        commands.start(config);
    });

commander.version(pkg.version)
    .usage('[cmd]');

async function readConfigFile(configFile) {

}

(function run(){
    setupExceptionHandler();
    commander.parse(process.argv);
    if (process.argv.length == 2) {
      commander.outputHelp();
    }
})();