'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var commander = _interopDefault(require('commander'));
var cron = _interopDefault(require('node-cron'));
var koa = _interopDefault(require('koa'));
var Router = _interopDefault(require('koa-router'));
var si = _interopDefault(require('systeminformation'));
var EBusClient = _interopDefault(require('@shome/ebus-client'));

var name = "@shome/ebus-agent";
var version = "1.0.0";
var description = "";
var main = "index.js";
var scripts = {
	build: "rollup -c",
	prepare: "npm run build",
	test: "echo \"Error: no test specified\" && exit 1"
};
var files = [
	"dist/",
	"bin/"
];
var author = "";
var license = "MIT";
var dependencies = {
	"@shome/ebus-client": "^1.0.0",
	commander: "^2.19.0",
	koa: "^2.6.2",
	"koa-router": "^7.4.0",
	"node-cron": "^2.0.3",
	systeminformation: "^3.54.0"
};
var devDependencies = {
	rollup: "^1.0.1",
	"rollup-plugin-json": "^3.1.0",
	"rollup-plugin-node-resolve": "^4.0.0"
};
var pkg = {
	name: name,
	version: version,
	description: description,
	main: main,
	scripts: scripts,
	files: files,
	author: author,
	license: license,
	dependencies: dependencies,
	devDependencies: devDependencies
};

async function start(options) {
    const metrics = {};
    scraping(metrics, options);
    const app = new koa();
    let api = new Router({
        prefix: '/api'
    });
    api.get('/metrics', ctx => {
        ctx.body = toPrometheusMetrics(metrics);
    });
    app.use(api.routes(), api.allowedMethods());
    app.use(async function(ctx) {
        ctx.body = 'Agent - OK';
    });
    const {server: {host, port}} = options;
    console.log(`Running on http://${host}:${port}/ (Press CTRL+C to quit)`);
    app.listen(port, host);
}

function toPrometheusMetrics(metrics) {
    const buff = [];
    for (const [name, metric] of Object.entries(metrics)) {
        const labels = metric.labels.map(label => `${label.name}="${label.value}"`);
        const labelsText = labels.length ? `{${labels.join(',')}}` : '';
        buff.push(`${name}${labelsText} ${metric.value}`);
    }
    return buff.join('\n');
}

const VAILLANT_CODE = 'bai';

const VAILLANT_SENSORS = [{
    name: 'flame_enabled',
    ebusName: 'Flame',
    description: 'Flame',
}, {
    name: 'circulation_pump_enabled',
    ebusName: 'CirPump',
    description: 'Circulation pump',
}, {
    name: 'flow_temp',
    ebusName: 'FlowTemp',
    description: 'Flow temperature',
}, {
    name: 'return_temp',
    ebusName: 'ReturnTemp',
    description: 'Return temperature',
}, {
    name: 'water_pump_enabled',
    ebusName: 'WP',
    description: 'Central heating pump',
}, {
    name: 'outdoor_temp',
    ebusName: 'OutdoorstempSensor',
    description: 'Outdoor temperature sensor',
}, {
    name: 'storage_temp',
    ebusName: 'StorageTemp',
    description: 'External water storage temperature',
}, {
    name: 'water_pressure',
    ebusName: 'WaterPressure',
    description: 'Internal water pressure',
}, {
    name: 'energy_internal_total',
    ebusName: 'PrEnergySumHc1',
    description: 'Sum of energy for heating system',
}, {
    name: 'energy_external_total',
    ebusName: 'PrEnergySumHwc1',
    description: 'Sum of energy for storage water',
}];

const sensorsByEbusName = {};

const sensorsByName = {};

for (const sensor of VAILLANT_SENSORS) {
    sensorsByName[sensor.name] = sensor;
    sensorsByEbusName[sensor.ebusName] = sensor;
}

async function scraping(metrics, { ebus }) {
    const ebusClient = new EBusClient({
        host: ebus.host, 
        port: ebus.port
    });

    const addEbus = items => {
        for (const [name, value] of Object.entries(items)) {
            const sensor = sensorsByEbusName[name];
            add(`ebus_sensor_${sensor.name}`, value);
        }
    };
    const add = (name, value, labels=[]) => {
        metrics[name] = {
            time: new Date().getTime(),
            value: getValue(value),
            labels,
        };
    };
    const getValue = value => {
        if (typeof value === 'boolean') {
            return value ? 1 : 0;
        }
        return value;
    };
    const ebusConfig = [{
        cron: '* * * * *',
        names: [
            'flame_enabled',
            'water_pump_enabled',
            'circulation_pump_enabled',
            'flow_temp',
            'return_temp',
            'outdoor_temp',
            'storage_temp',
            'water_pressure',
        ],
    }, {
        cron: '0 1 * * *',
        names: [     
            'energy_internal_total',
            'energy_external_total',    
        ],
    }];
    for (const item of ebusConfig) {
        const names = getEBusNames(item.names);
        try {
            addEbus(await ebusClient.readMany(names, VAILLANT_CODE));
        } catch (e) {
            console.warn(e);
        }
        cron.schedule(item.cron, async () => {
            addEbus(await ebusClient.readMany(names, VAILLANT_CODE));
        });
    }
    
    async function readInfo() {
        const [memData, loadData, fsData, tempData] = await Promise.all([
            si.mem(),
            si.currentLoad(),
            si.fsSize(),
            si.cpuTemperature(),
        ]);
        addMemoryInfo(memData);
        addLoadInfo(loadData);
        addCpuTemp(tempData);
        
    }
    function addMemoryInfo(data) {
        add('ebus_memory_total', data.total);
        add('ebus_memory_free', data.free);
        add('ebus_memory_used', data.used);
        add('ebus_memory_swap_total', data.swaptotal);
        add('ebus_memory_swap_used', data.swapused);
        add('ebus_memory_swap_free', data.swapfree);
    }
    
    function addLoadInfo(data) {
        add('ebus_cpu_load_avg', data.avgload);
    }
    function addCpuTemp(data) {
        add('ebus_cpu_temp', data.main);
    }
    function getEBusNames(names) {
        return names.map(name => sensorsByName[name].ebusName);
    }
    cron.schedule('* * * * *', readInfo);
    readInfo();
}

function logError(error){
    if ("string" !== typeof error && error.stack) {
        error = error.stack;
    }
    let message = `\n${error} \n\nNode.js ${process.version}\n`;
    console.log(message);
}

function setupExceptionHandler(){
    process.on("uncaughtException", logError);
    process.on('unhandledRejection', logError);  // catch all promisess
}

commander.command('start')
    .option('--host <host>', 'metric exporter host', 'localhost')
    .option('--port <port>', 'metric exporter port', 9091)
    .option('--ebus-host <host>', 'ebus service host', 'localhost')
    .option('--ebus-port <port>', 'ebus service port', 8888)
    
    // .option('--wamp-url <url>', 'wamp server url', 'ws://localhost:8080/ws')
    // .option('--wamp-realm <realm>', 'wamp server realm', 'shome')
    .action(options => {
        const { ebusPort, ebusHost, host, port } = options;
        start({
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
