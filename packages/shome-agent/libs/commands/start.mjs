import koa from 'koa';
import Router from 'koa-router';
// import koaBody from 'koa-body';


import EbusMetricReader from '../ebus/reader'; 
// import fluentBitToMetrics from '../fluentbit';
import systemInfoReader from '../info';


export async function start(config) {
    const collectMetrics = createMetricCollector(config);
    const app = new koa();
    let api = new Router({
        prefix: '/api'
    });

    api.get('/metrics', async ctx => {
        const labels = { node: config.name };
        const metrics = await collectMetrics();
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
    const groups = groupByName(metrics);
    const buff = [];
    for (const [name, meta] of Object.entries(groups)) {
        if (meta.description) {
            buff.push(`# HELP ${name} ${meta.description}`)
        }
        if (meta.type) {
            buff.push(`# TYPE ${name} ${meta.type}`)
        }
        for( const metric of meta.items) {
            const textLabels = preapreLabels(labels, metric.labels);
            buff.push(`${name}${textLabels} ${metric.value}`);
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

function createMetricCollector(config) {
    const getTime = () => new Date().getTime();    
    const ebus = new EbusMetricReader(config.ebus);
    const ebusEnabled = config.ebus.enabled;
    const ebusInterval = config.ebus.interval * 1000;
    let idle = getTime() - ebusInterval;
    return async () => {
        const collectors = [systemInfoReader(config)];
        if (ebusEnabled){
            const now = getTime();
            if(now - idle >= ebusInterval) {
                collectors.push(ebus.read());
                idle = now;
            }
        }
        const metrics = await Promise.all(collectors);
        return metrics.reduce((prev, curr) => prev.concat(curr), []);
    };
}