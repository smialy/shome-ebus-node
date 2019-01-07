'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var commander = _interopDefault(require('commander'));
var koa = _interopDefault(require('koa'));
var Router = _interopDefault(require('koa-router'));
require('koa-body');
var EBusClient = _interopDefault(require('@shome/ebus-client'));
var si = _interopDefault(require('systeminformation'));

var name = "@shome/node-agent";
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
	"koa-body": "^4.0.6",
	"koa-router": "^7.4.0",
	msgpack5: "^4.2.1",
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

const VAILLANT_CODE = 'bai';

const VAILLANT_SENSORS = [{
    name: 'flame_enabled',
    ebusName: 'Flame',
    description: 'Flame',
    type: 'gauge',
}, {
    name: 'circulation_pump_enabled',
    ebusName: 'CirPump',
    description: 'Circulation pump',
    type: 'gauge',
}, {
    name: 'flow_temp',
    ebusName: 'FlowTemp',
    description: 'Flow temperature',
    type: 'gauge',
}, {
    name: 'return_temp',
    ebusName: 'ReturnTemp',
    description: 'Return temperature',
    type: 'gauge',
}, {
    name: 'water_pump_enabled',
    ebusName: 'WP',
    description: 'Central heating pump',
    type: 'gauge',
}, {
    name: 'outdoor_temp',
    ebusName: 'OutdoorstempSensor',
    description: 'Outdoor temperature sensor',
    type: 'gauge',
}, {
    name: 'storage_temp',
    ebusName: 'StorageTemp',
    description: 'External water storage temperature',
    type: 'gauge',
}, {
    name: 'water_pressure',
    ebusName: 'WaterPressure',
    description: 'Internal water pressure',
    type: 'gauge',
}, {
    name: 'energy_internal_total',
    ebusName: 'PrEnergySumHc1',
    description: 'Sum of energy for heating system',
    type: 'counter',
}, {
    name: 'energy_external_total',
    ebusName: 'PrEnergySumHwc1',
    description: 'Sum of energy for storage water',
    type: 'counter',
}];

const sensorsByEbusName = {};
const ebusNames = [];
for (const sensor of VAILLANT_SENSORS) {
    sensorsByEbusName[sensor.ebusName] = sensor;
    ebusNames.push(sensor.ebusName);
}


class MetricReader {
    constructor(config) {
        this.config = config;
    }
    async read() {
        const client = this.getClient();
        try {
            const buff = [];
            const items = await client.readMany(ebusNames, VAILLANT_CODE);
            for(const [ename, evalue] of Object.entries(items)) {
                const { name, description, type } = sensorsByEbusName[ename];
                buff.push({
                    time: new Date().getTime(),
                    name: `ebus_sensor_${name}`,
                    value: convertValue(evalue),
                    description,
                    type,
                });
            }
            return buff;
        } catch (e) {
            console.warn(e);
        }
    }
    getClient() {
        if (!this._client) {
            const {host, port} = this.config;
            this._client = new EBusClient({ host, port });
        }
        return this._client;
    }
}

function convertValue (value) {
    if (typeof value === 'boolean') {
        return value ? 1 : 0;
    }
    return value;
}

const TYPE_COUNTER = 'counter';
const TYPE_GAUGE = 'gauge';

async function toMetric(config) {
    const [
        memData,
        currentLoadData,
        fsData,
        tempData
    ] = await Promise.all([
        si.mem(),
        si.currentLoad(),
        si.fsSize(),
        si.cpuTemperature(),
    ]);
    // console.log(fsData)
    const data = [
        addMemoryInfo(memData),
        addLoadInfo(currentLoadData),
        addFsSize(fsData, config.node.fs),
        addCpuTemp(tempData),
    ];
    let buff = [];
    for (const item of data) {
        buff = buff.concat(item);
    }
    return buff;
}

function addMemoryInfo(data) {
    return [
        add('node_memory_total', data.total, 'Node memory total', TYPE_COUNTER),
        add('node_memory_used', data.used),
        add('node_memory_free', data.free),
        add('node_memory_available', data.available),
        add('node_memory_swap_total', data.swaptotal, 'Node swap total', TYPE_COUNTER),
        add('node_memory_swap_used', data.swapused),
        add('node_memory_swap_free', data.swapfree),
    ];
}

function addLoadInfo(data) {
    return [
        add('node_cpu_load_avg', data.avgload),
    ];
}
function addCpuTemp(data) {
    return [
        add('node_cpu_temp', data.main),
    ];
}

function addFsSize(data, names='*') {
    const filter = item => {
        if(names === '*') {
            return true;
        }
        return names.some(name => item.fs.indexOf(name) !== -1);
    };
    return data
        .filter(filter)
        .map(item => [
            add('node_fs_size_bytes', item.size, 'Size in bytes', TYPE_COUNTER, { name: item.fs, type: item.type, mount: item.mount}),
            add('node_fs_used_bytes', item.used, 'Used in bytes', TYPE_GAUGE, { name: item.fs, type: item.type, mount: item.mount}),
            add('node_fs_used_percent', item.use, 'Used in percent', TYPE_GAUGE, { name: item.fs, type: item.type, mount: item.mount}), 
        ])
        .reduce((prev, current) => prev.concat(current), []);
}

function add(name, value, description, type=TYPE_GAUGE, labels={}) {
    return {
        name,
        value,
        time: new Date().getTime(),
        description,
        type,
        labels,
    };
}

async function start(config) {
    let metrics = {};

    runCollectors(config, items => {
        Object.assign(metrics, groupByName(items));
    });
    const app = new koa();
    let api = new Router({
        prefix: '/api'
    });
    api.get('/metrics', ctx => {
        const labels = { node: config.name };
        ctx.body = toPrometheusMetrics(metrics, labels);
    });
    
    // api.post('/fluentbit', koaBody(), async ctx => {
    //     const type = ctx.request.get('fluent-tag');
    //     if (type) {
    //         const body = ctx.request.body;
    //         Object.assign(metrics, groupByName(fluentBitToMetrics(type, body)));
    //         ctx.body = 'OK';
    //     } else {
    //         console.warn('Missing: "fluent-tag" header');
    //     }
    // });

    app.use(api.routes(), api.allowedMethods());
    app.use(async function(ctx) {
        ctx.body = 'Agent - OK';
    });
    const {server: {host, port}} = config;
    console.log(`Running on http://${host}:${port}/ (Press CTRL+C to quit)`);
    app.listen(port, host);
}

function preapreLabels(...args) {
    const labels = {};
    for (const arg of args) {
        if (arg && typeof args === 'object') {
            Object.assign(labels, arg);
        }
    }
    const items = Object.entries(labels)
        .map(([name, value]) => `${name}="${value}"`);
    return items.length ? `{${items.join(',')}}` : '';
}

function toPrometheusMetrics(metrics, labels={}) {
    const buff = [];
    for (const [name, meta] of Object.entries(metrics)) {
        if (meta.description) {
            buff.push(`# HELP ${name} ${meta.description}`);
        }
        if (meta.type) {
            buff.push(`# TYPE ${name} ${meta.type}`);
        }
        for( const metric of meta.items) {
            const textLabels = preapreLabels(labels, metric.labels);
            buff.push(`${name}${textLabels} ${metric.value} ${metric.time}`);
        }
    }
    return buff.join('\n');
}


function groupByName(metrics) {
    const buff = {};
    
    for(const metric of metrics) {
        if (!buff[metric.name]) {
            buff[metric.name] = {
                items: [],
                type: metric.type || '',
                description: metric.description || '',
            };
        }
        buff[metric.name].items.push({
            time: metric.time,
            value: metric.value,
            labels: metric.labels || [],
        });
    }
    return buff;
}


async function runCollectors(config, listener) {
    const collectors = [
        systemCollector(config),
    ];
    if (config.ebus.enabled) {
        collectors.push(ebusCollector(config.ebus));
    }
    (async function run() {
        for(const collector of collectors) {
            listener(await collector());
        }
        setTimeout(run, 60 * 1000);
    })();
}

function ebusCollector(config) {
    const ebus = new MetricReader(config.ebus);
    return async () => await ebus.read();
}
function systemCollector(config) {
    return async () => await toMetric(config);
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

commander.command('start <nodeName>')
    .option('--host <host>', 'metric exporter host', 'localhost')
    .option('--port <port>', 'metric exporter port', 9091)
    .option('--enable-ebus', 'enable ebus service', false)
    .option('--ebus-host <host>', 'ebus service host', 'localhost')
    .option('--ebus-port <port>', 'ebus service port', 8888)
    .option('--node-fs <names>', 'node fs names', '*')
    
    .action((name$$1, options) => {
        const nodeFs = options.nodeFs === '*' ? '*' : options.nodeFs.split(',');
        const config = {
            name: name$$1,
            server: {
                host: options.host,
                port: options.port,
            },
            ebus: {
                enabled: !!options.enableEbus,
                host: options.ebusHost,
                port: options.ebusPort,
            },
            node: {
                fs: nodeFs,
            }
        };
        console.log(config);
        start(config);
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
