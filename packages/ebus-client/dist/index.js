'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var net = _interopDefault(require('net'));

const Status = {
    PENDING: 1,
    CONNECTING: 2,
    CONNECTED: 4,
    CLOSING: 8,
    CLOSED: 16,
};

async function createConnection({host, port, protocolFactory}) {
    let status = Status.PENDING;

    return new Promise((resolve, reject) => {
        const isClosing = () => status === Status.CLOSING || status === Status.CLOSED;
        const createTransport = socket => ({
            isClosing,
            write(data) {
                if(!isClosing()){
                    socket.write(data);
                }
            },
            close() {
                socket.end();
                status = Status.CLOSING;
            },
        });
        const protocol = protocolFactory();
        const connections = net.connect({ host, port });
        connections.setNoDelay(true);
        status = Status.CONNECTING;
        connections.on('ready', () => {
            status = Status.CONNECTED;
            const transport = createTransport(connections);
            protocol.connectionMade(transport);
            resolve({
                transport,
                protocol,
            });
        });
        connections.on('data', (data) => {
            if (status === Status.CONNECTED) {
                protocol.dataReceived(data.toString());
            }
        });
        connections.on('end', err => {
            if (status === Status.CONNECTED || status === Status.CLOSING) {
                protocol.connectionLost('end');
            }
            status = Status.CLOSING;
        });
        connections.on('close', hasError => {
            status = Status.CLOSED;
        });
        connections.on('error', err => {
            if(status === Status.CONNECTING) {
                reject(err);
            } else {
                console.warn(err);
            }
        });
    })
}

class TelnetProtocol {
    constructor() {
        this._queue = [];
        this._buff = [];
    }
    send(message) {
        const defeder = createDefeder();
        this._queue.push({
            defeder,
            message,
        });
        this._sendNext();
        return defeder.promise;
    }
    _sendNext() {
        if(!this._sync && this._queue.length) {
            this._sync = true;
            const { message } = this._queue[0];
            this._transport.write(message + '\n');
        }
    }
    connectionMade(transport) {
        this._transport = transport;
    }
    connectionLost(error) {
        this._transport = null;
    }
    dataReceived(data) {
        this._buff += data;
        while(true) {
            const index = this._buff.indexOf('\n\n');
            if (index === -1) {
                break;
            }
            const part = this._buff.substr(0, index + 2);
            this._buff = this._buff.substr(index + 2);
            const { defeder } = this._queue.shift();
            defeder.resolve(part);
        }
        if (!this._buff.length) {
            this._sync = false;
            this._sendNext();
        }
    }
}

class EBusProtocol extends TelnetProtocol {
    async find(device) {
        return await this.send(`find -c ${device}`);
    }
    async read(name, device) {
        const value = await this.send(`read -f -c ${device} ${name}`);
        return parseValue(value.trim());
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
    if(/^-?\d+$/.test(value)) {
        const number = parseInt(value, 10);
        if (!Number.isNaN(number)){
            return number;
        }
    }
    if(/^-?\d+\.\d+$/.test(value)) {
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

function createDefeder(){
    const defeder = {
        resolve: null,
        reject: null,
    };
    defeder.promise = new Promise((resolve, reject) => {
        defeder.resolve = resolve;
        defeder.reject = reject;
    });
    Object.freeze(defeder);
    return defeder;
}

function wait(timeout) {
    return new Promise((resolve => setTimeout(resolve, timeout)))
}

class EBusClient {
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

module.exports = EBusClient;
