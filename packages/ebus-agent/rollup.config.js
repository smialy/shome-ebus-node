const json = require('rollup-plugin-json');
const resolve = require('rollup-plugin-node-resolve');


module.exports = {
    input: 'libs/cli.mjs',
    plugins: [
        json(),
        resolve({
            modulesOnly: true,
        }),
    ],
    output: {
        file: 'dist/cli.js',
        format: 'cjs',
        name: 'ebus-agent',
    },
};