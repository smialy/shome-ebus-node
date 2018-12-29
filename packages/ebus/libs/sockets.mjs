import net from 'net';

const PENDING = 1;
const CONNECTING = 2;
const CONNECTED = 4;
const CLOSING = 8;
const CLOSED = 16;

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

export async function createConnection({host, port, protocolFactory}) {
    let status = PENDING;

    return new Promise((resolve, reject) => {
        const isClosing = () => status === CLOSING || status === CLOSED;
        const createTransport = socket => ({
            isClosing,
            write(data) {
                if(!isClosing()){
                    socket.write(data);
                }
            },
            close() {
                socket.end();
                status = CLOSING;
            },
        });
        const protocol = protocolFactory();
        const connections = net.connect({ host, port });
        connections.setNoDelay(true);
        status = CONNECTING;
        connections.on('ready', () => {
            status = CONNECTED;
            const transport = createTransport(connections);
            protocol.connectionMade(transport);
            resolve({
                transport,
                protocol,
            });
        })
        connections.on('data', (data) => {
            if (status === CONNECTED) {
                protocol.dataReceived(data.toString());
            }
        });
        connections.on('end', err => {
            if (status === CONNECTED || status === CLOSING) {
                protocol.connectionLost('end');
            }
            status = CLOSING;
        });
        connections.on('close', hasError => {
            status = CLOSED;
        });
        connections.on('error', err => {
            if(status === CONNECTING) {
                reject(err);
            } else {
                console.warn(err);
            }
        });
    })
}
