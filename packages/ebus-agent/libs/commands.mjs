import { EBusClient } from '@shome/ebus';

export async function start({ ebusPort, ebusHost }) {

    const ebusClient = new EBusClient({
        host: ebusHost, 
        port: ebusPort
    });
    await ebusClient.connect();

    const names = [
        'FanSpeed',
        'Flame',
        'FlowTemp',
        'OutdoorstempSensor',
        'PrEnergySumHc1',
        'PrEnergySumHwc1',
        'ReturnTemp',
        'Storageloadpump',
        'StorageTemp',
        'StorageTempDesired',
        'WaterPressure',
        'WP',
    ];
    // setTimeout(() => transport.close(), 1000);
    console.log(await ebusClient.readMany(names, 'bai'));
    console.log(await ebusClient.read('ReturnTemp', 'bai'));
    // console.log(await ebusClient.readAll('bai'));
    ebusClient.close();
    
}


