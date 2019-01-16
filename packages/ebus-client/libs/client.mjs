import { createConnection } from './sockets';
import { EBusProtocol } from './protocols';


const wait = timeout => new Promise(resolve => setTimeout(resolve, timeout));

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
    async find(device='') {
        await this.connect();
        return await this._protocol.find(device);
    }
    async read(device, name) {
        await this.connect();
        return await this._protocol.read(device, name);
    }
    async * readMany(device, names) {
        await this.connect();
        const results = {};
        for (const name of names) {
            yield [name, await this._protocol.read(device, name)];
        }
        return results;
    }
    async * readAll(device) {
        await this.connect();
        const data = await this._protocol.find(device);
        const lines = data.split('\n');
        const values = {};
        for (const line of lines) {
            if (line.length && line.indexOf(device) !== -1) {
                const parts = line.split(' = ');
                if (parts.length == 2) {
                    const name = parts[0].substr(device.length + 1);
                    if (parts[0].indexOf(device) === 0) {
                        yield [name, await this.read(device, name)];
                    }
                }
            }
        }
        return values;
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

