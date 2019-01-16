export class IProtocol {
    connectionMade(transport) {

    }
    connectionLost(error) {

    }
    dataReceived(data) {

    }
}

export class TelnetProtocol {
    constructor() {
        this._queue = [];
        this._buff = []
    }
    send(...args) {
        const message = args.join(' ').trim(); 
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

export class EBusProtocol extends TelnetProtocol {
    async find(device='') {
        const circut = device ? `-c ${device}` : '';
        return await this.send('find', circut);
    }
    async read(device, name) {
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