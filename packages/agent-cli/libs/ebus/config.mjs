
export const VAILLANT_CODE = 'bai';

export const VAILLANT_SENSORS = [{
    name: 'flame_enabled',
    ebusName: 'Flame',
    description: 'Flame',
    type: 'gauge',
}, {
    name: 'circulation_pump_enabled',
    ebusName: 'CirPump',
    description: 'Circulation pump',
    type: 'gauge',
}, {
    name: 'flow_temp',
    ebusName: 'FlowTemp',
    description: 'Flow temperature',
    type: 'gauge',
}, {
    name: 'return_temp',
    ebusName: 'ReturnTemp',
    description: 'Return temperature',
    type: 'gauge',
}, {
    name: 'water_pump_enabled',
    ebusName: 'WP',
    description: 'Central heating pump',
    type: 'gauge',
}, {
    name: 'outdoor_temp',
    ebusName: 'OutdoorstempSensor',
    description: 'Outdoor temperature sensor',
    type: 'gauge',
}, {
    name: 'storage_temp',
    ebusName: 'StorageTemp',
    description: 'External water storage temperature',
    type: 'gauge',
}, {
    name: 'water_pressure',
    ebusName: 'WaterPressure',
    description: 'Internal water pressure',
    type: 'gauge',
}, {
    name: 'energy_internal_total',
    ebusName: 'PrEnergySumHc1',
    description: 'Sum of energy for heating system',
    type: 'counter',
}, {
    name: 'energy_external_total',
    ebusName: 'PrEnergySumHwc1',
    description: 'Sum of energy for storage water',
    type: 'counter',
}];