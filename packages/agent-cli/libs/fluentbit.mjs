

export default function fluentBitToMetrics(type, data) {
    if (TRANSFORMERS[type]) {
        return TRANSFORMERS[type](data);
    }
    return [];
}

const TRANSFORMERS = {
    memory(data) {
        const buff = [];

        for(const row of data) {
            buff.push({
                time: row.date,
                name: 'node_memory_total_bytes',
                value: row['Mem.total'],
                description: 'Total memory',
                type: 'gauge',
            });
            buff.push({
                time: row.date,
                name: 'node_memory_used_bytes',
                value: row['Mem.used'],
                description: 'Used memory',
                type: 'gauge',
            });
            buff.push({
                time: row.date,
                name: 'node_memory_free_bytes',
                value: row['Mem.free'],
                description: 'Free memory',
                type: 'gauge',
            });
            buff.push({
                time: row.date,
                name: 'node_swap_total_bytes',
                value: row['Swap.total'],
                description: 'Total swap memory',
                type: 'gauge',
            });
            buff.push({
                time: row.date,
                name: 'node_swap_used_bytes',
                value: row['Swap.used'],
                description: 'Used swap memory',
                type: 'gauge',
            });
            buff.push({
                time: row.date,
                name: 'node_swap_free_bytes',
                value: row['Swap.free'],
                description: 'Free swap memory',
                type: 'gauge',
            });
        }
        return buff;
    },
    disk(data) {
        const buff = [];
        for(const {date, read_size, write_size} of data) {
            buff.push({
                time: date,
                name: 'node_disk_usage_read_bytes',
                value: read_size,
                description: 'Disc read',
                type: 'gauge',
            });
            buff.push({
                time: date,
                name: 'node_disk_usage_write_bytes',
                value: write_size,
                description: 'Disc write',
                type: 'gauge',
            });
        }
        return buff;
    },
    cpu(data) {
        const buff = [];
        for(const {date, cpu_p, user_p, system_p} of data) {
            buff.push({
                time: date,
                name: 'node_cpu_overall',
                value: cpu_p,
                description: 'CPU usage of the overall system',
                type: 'gauge',
            });
            buff.push({
                time: date,
                name: 'node_cpu_user',
                value: user_p,
                description: 'CPU usage in User mode',
                type: 'gauge',
            });
            buff.push({
                time: date,
                name: 'node_cpu_system',
                value: system_p,
                description: 'CPU usage in Kernel mode',
                type: 'gauge',
            });
        }
        return buff;
    }
}