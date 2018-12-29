import { EBusClient } from '@shome/ebus';

export async function start({ ebusPort, ebusHost }) {

    const ebusClient = new EBusClient({
        host: ebusHost, 
        port: ebusPort
    });
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
    let i = 10;
    const check = async () => {
        console.log(`Read many: ${names}`);
        console.log(await ebusClient.readMany(names, 'bai'));
        console.log('Read one: ReturnTemp');
        console.log(await ebusClient.read('ReturnTemp', 'bai'));
        if( i -= 1 ){
            recheck();
        } else {
            ebusClient.close();
        }
    }
    const recheck = () => setTimeout(check, 1000);
    check();
    // console.log(await ebusClient.readAll('bai'));
    
}


