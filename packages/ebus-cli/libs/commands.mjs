
import EbusClient from '@shome/ebus-client';

export async function find(device, options) {
    const { host, port } = options;
    const client = new EbusClient({ host, port });
    const result = await client.find(device);
    console.log(result.trim());
    client.close();
}

export async function read(device, name, options) {
    const { host, port } = options;
    const client = new EbusClient({ host, port });
    const result = await client.read(device, name);
    console.log(result);
    client.close();
}

export async function readAll(device, options) {
    const { host, port } = options;
    const client = new EbusClient({ host, port });
    const result = await client.readAll(device);
    const format = options.format;
    if (format === 'json') {
        const data = {};
        let i = 0;
        for await (const [name, value] of result) {
            process.stdout.write(`\rReading: ${i}`);
            data[name] = value;
            i+=1;
        }    
        process.stdout.write('\r' + JSON.stringify(data));
    } else {
        for await (const [name, value] of result) {
            console.log(`${name} = ${value}`);
        }
    }
    client.close();
}
