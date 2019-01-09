import si from 'systeminformation';

const TYPE_COUNTER = 'counter';
const TYPE_GAUGE = 'gauge';

export default async function toMetric(config) {
    const [
        memData,
        currentLoadData,
        fsData,
        fsStats,
        tempData
    ] = await Promise.all([
        si.mem(),
        si.currentLoad(),
        si.fsSize(),
        si.fsStats(),
        si.cpuTemperature(),
    ]);
    // console.log(fsData)
    const data = [
        addMemoryInfo(memData),
        addLoadInfo(currentLoadData),
        addFs(fsData, fsStats, config.node.fs),
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
        add('node_cpu_load', data.currentload),
        add('node_cpu_load_user', data.currentload_user),
        add('node_cpu_load_system', data.currentload_system),
        add('node_cpu_load_average', data.avgload),
        
        
    ];
}

function addCpuTemp(data) {
    return [
        add('node_cpu_temp', data.main),
    ];
}

function addFs(sizes, stats, names='*') {
    const filterByName = item => {
        if(names === '*') {
            return true;
        }
        return names.some(name => item.fs.indexOf(name) !== -1);
    }
    const statsMetrics = [];
    if (stats.rx_sec !== -1) {
        statsMetrics.push(add('node_fs_rx', stats.rx_sec));
        statsMetrics.push(add('node_fs_tx', stats.tx_sec));
    }
    const sizesMetrics = sizes
        .filter(filterByName)
        .map(item => [
            add('node_fs_size_bytes', item.size, 'Size in bytes', TYPE_COUNTER, { name: item.fs, type: item.type, mount: item.mount}),
            add('node_fs_used_bytes', item.used, 'Used in bytes', TYPE_GAUGE, { name: item.fs, type: item.type, mount: item.mount}),
            add('node_fs_used_percent', item.use, 'Used in percent', TYPE_GAUGE, { name: item.fs, type: item.type, mount: item.mount}), 
        ]).concat(statsMetrics);
    
    return flatArray(sizesMetrics); 
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

const flatArray = items => items.reduce((prev, current) => prev.concat(current), []);
