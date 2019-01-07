import { createConnection } from './sockets';
import { EBusProtocol } from './protocols';



function wait(timeout) {
    return new Promise((resolve => setTimeout(resolve, timeout)))
}

export default class EBusClient {
    constructor(options) {
        this.options = options;
        this._transport = null;
        this._protocol = null;
        this._connected = false;
    }
    async connect() {
        if (!this._connected) {
            await this._createConnection();
            this._connected = true;
        }
        if (this._transport.isClosing()) {
            await wait(1000);
            this._connected = false;
            await this.connect();
        }
    }
    async _createConnection() {
        const { host, port } = this.options;
        const { transport, protocol } = await createConnection({ 
            protocolFactory: () => new EBusProtocol(),
            host, 
            port, 
        });
        if (this._transport) {
            this.transport.close();
        }
        this._transport = transport;
        this._protocol = protocol;
        
    }
    async read(name, device) {
        await this.connect();
        return await this._protocol.read(name, device);
    }
    async readMany(names, device) {
        await this.connect();
        const promises = names.map(name => this._protocol.read(name, device));
        const values = await Promise.all(promises);
        const results = {};
        for (let i = 0; i < names.length; i += 1) {
            results[names[i]] = values[i];
        }
        return results;
    }
    async readAll(device) {
        await this.connect();
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
        if (this._connected) {
            this._transport.close();
            this._transport = null;
            this._protocol = null;
            this._connected = false;
        }
    }

}
