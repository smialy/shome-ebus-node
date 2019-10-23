import si from 'systeminformation';

const TYPE_COUNTER = 'counter';
const TYPE_GAUGE = 'gauge';

export default async function toMetric(config) {
    const [
        timeData,
        memData,
        currentLoadData,
        fsData,
        fsStats,
        tempData,
        networkStats,
        dockerStats,
    ] = await Promise.all([
        si.time(),
        si.mem(),
        si.currentLoad(),
        si.fsSize(),
        si.fsStats(),
        si.cpuTemperature(),
        networkInfo(),
    ]);
    const data = [
        addTimeData(timeData),
        addMemoryInfo(memData),
        addLoadInfo(currentLoadData),
        addFs(fsData, fsStats, config.node.fs),
        addCpuTemp(tempData),
        //addNetwork(networkStats),
    ];
    let buff = [];
    for (const item of data) {
        buff = buff.concat(item);
    }
    return buff;
}
function addTimeData(data) {
    return [
        add('node_boot_time_seconds', data.uptime, 'Node boot time, in unixtime.'),
        add('node_local_time', data.current, 'Node time', TYPE_COUNTER, {timezone: data.timezone, timezone_name: data.timezoneName}),
    ];
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

async function networkInfo() {
    const stats = await si.networkInterfaces();
    const loaders = stats
        .map(stat => stat.iface)
        .filter(iface => iface !== 'lo')
        .map(async iface => await si.networkStats(iface))
    return await Promise.all(loaders);
}

function addNetwork(stats) {
    return flatArray(stats
        .filter(stat => stat.rx_sec !== -1)
        .map(stat => [
            add('node_network_rx', stat.rx_sec, '', TYPE_GAUGE, {name: stat.iface, state: stat.operstate}),
            add('node_network_tx', stat.tx_sec, '', TYPE_GAUGE, {name: stat.iface, state: stat.operstate}),
        ])
    );
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
