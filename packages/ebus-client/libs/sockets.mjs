import net from 'net';
import { Status } from './consts';


export async function createConnection({host, port, protocolFactory}) {
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
        })
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
