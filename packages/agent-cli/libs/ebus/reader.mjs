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
        this._lastReadTime = getTime(); 
    }
    async read() {
        if (!this.config.enabled) {
            return [];
        }
        const interval = this.config.interval * 1000;
        const now = getTime();

        if (now - this._lastReadTime < interval && this._cache.length) {
            return this._cache;
        }
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
            this._lastReadTime = now;
            this._cache = buff;
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

[{
    name: 'ebus...',
}]