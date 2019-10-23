import EBusClient from '@shome/ebus-client';


import { VAILLANT_CODE, VAILLANT_SENSORS } from './config';

const sensorsByEbusName = {};
const ebusNames = [];
for (const sensor of VAILLANT_SENSORS) {
    sensorsByEbusName[sensor.ebusName] = sensor;
    ebusNames.push(sensor.ebusName);
}

const getTime = () => new Date().getTime();

export default class MetricReader {
    constructor(config) {
        this.config = config;
        this._cache = [];
        this._lastReadTime = 0;
        this._loading = false;
    }
    async read() {
        if (!this.config.enabled) {
            return [];
        }
        const interval = this.config.interval * 1000;
        const now = getTime();
        console.log(now, interval, now - this._lastReadTime)
        if (!this._loading && now - this._lastReadTime > interval) {
            this._loading = true;
            this._lastReadTime = now;
            setTimeout(async () => {
                const client = this.getClient();
                try {
                    const buff = [];
                    const items = await client.readMany(VAILLANT_CODE, ebusNames);
                    for await (const [ename, evalue] of items) {
                        const { name, description, type } = sensorsByEbusName[ename];
                        buff.push({
                            time: new Date().getTime(),
                            name: `ebus_sensor_${name}`,
                            value: convertValue(evalue),
                            description,
                            type,
                        });
                    }
                    this._loading = false;
                    this._cache = buff;
                    return buff;
                } catch (e) {
                    console.warn(e);
                }
            });
        }
        return this._cache;
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

[{
    name: 'ebus...',
}]