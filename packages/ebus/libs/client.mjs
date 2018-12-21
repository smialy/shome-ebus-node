import { createConnection, TelnetProtocol } from './sockets';


class EBusProtocol extends TelnetProtocol {
    async find(device) {
        return await this.send('find', `-c ${device}`);
    }
    async read(name, device) {
        const value = await this.send('read', `-f -c ${device} ${name}`);
        return parseValue(value.trim());
    }
}

export class EBusClient {
    constructor(options) {
        this.options = options;
        this._transport = null;
        this._protocol = null;
    }
    async connect() {
        const { host, port } = this.options;
        const { transport, protocol } = await createConnection({ 
            protocolFactory: () => new EBusProtocol(),
            host, 
            port, 
        });
        this._transport = transport;
        this._protocol = protocol;
    }
    async read(name, device) {
        return await this._protocol.read(name, device);
    }
    async readMany(names, device) {
        const promises = names.map(name => this._protocol.read(name, device));
        const values = await Promise.all(promises);
        const results = {};
        for (let i = 0; i < names.length; i += 1) {
            results[names[i]] = values[i];
        }
        return results;
    }
    async readAll(device) {
        const data = await this._protocol.find(device);
        const lines = data.split('\n');
        const names = [];
        const promises = [];
        for (const line of lines) {
            if (line.length && line.indexOf(device) !== -1) {
                const parts = line.split(' = ');
                if (parts.length == 2) {
                    const name = parts[0].substr(device.length + 1);
                    if (parts[0].indexOf(device) === 0) {
                        // const value = parts[1].trim();
                        names.push(name);
                        promises.push(this.read(name, device));    
                    }
                }
            }            
        }
        const results = {};
        if (names) {
            const values = await Promise.all(promises);
            for (let i = 0; i < names.length; i += 1) {
                results[names[i]] = values[i];
            }
        }
        return results;
    }
    close() {
        this._transport.close();
    }

}

function parseValue(str) {
    const value = str.split(';')[0];
    if (value === 'on' || value === 'yes') {
        return true; 
    }
    if (value === 'off' || value === 'no') {
        return false; 
    }
    if(/^\d+$/.test(value)) {
        const number = parseInt(value, 10);
        if (!Number.isNaN(number)){
            return number;
        }
    }
    if(/^[\d.]+$/.test(value)) {
        const number = parseFloat(value);
        if (!Number.isNaN(number)){
            return number;
        }
    }
    if (value.indexOf('ERR:') !== -1) {
        return null;
    }
    return str;
}
