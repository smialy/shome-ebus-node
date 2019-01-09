import si from 'systeminformation';

const TYPE_COUNTER = 'counter';
const TYPE_GAUGE = 'gauge';

export default async function toMetric(config) {
    const [
        memData,
        currentLoadData,
        fsData,
        tempData
    ] = await Promise.all([
        si.mem(),
        si.currentLoad(),
        si.fsSize(),
        si.cpuTemperature(),
    ]);
    // console.log(fsData)
    const data = [
        addMemoryInfo(memData),
        addLoadInfo(currentLoadData),
        addFsSize(fsData, config.node.fs),
        addCpuTemp(tempData),
    ];
    let buff = [];
    for (const item of data) {
        buff = buff.concat(item);
    }
    return buff;
}

function addMemoryInfo(data) {
    return [
        add('node_memory_total', data.total, 'Node memory total', TYPE_COUNTER),
        add('node_memory_used', data.used),
        add('node_memory_free', data.free),
        add('node_memory_available', data.available),
        add('node_memory_swap_total', data.swaptotal, 'Node swap total', TYPE_COUNTER),
        add('node_memory_swap_used', data.swapused),
        add('node_memory_swap_free', data.swapfree),
    ];
}

function addLoadInfo(data) {
    return [
        add('node_cpu_load_avg', data.avgload),
    ];
}
function addCpuTemp(data) {
    return [
        add('node_cpu_temp', data.main),
    ];
}

function addFsSize(data, names='*') {
    const filter = item => {
        if(names === '*') {
            return true;
        }
        return names.some(name => item.fs.indexOf(name) !== -1);
    }
    return data
        .filter(filter)
        .map(item => [
            add('node_fs_size_bytes', item.size, 'Size in bytes', TYPE_COUNTER, { name: item.fs, type: item.type, mount: item.mount}),
            add('node_fs_used_bytes', item.used, 'Used in bytes', TYPE_GAUGE, { name: item.fs, type: item.type, mount: item.mount}),
            add('node_fs_used_percent', item.use, 'Used in percent', TYPE_GAUGE, { name: item.fs, type: item.type, mount: item.mount}), 
        ])
        .reduce((prev, current) => prev.concat(current), []);
}

function add(name, value, description, type=TYPE_GAUGE, labels={}) {
    return {
        name,
        value,
        time: new Date().getTime(),
        description,
        type,
        labels,
    };
}