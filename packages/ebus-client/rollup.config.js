const json = require('rollup-plugin-json');
const resolve = require('rollup-plugin-node-resolve');


module.exports = {
    input: 'libs/index.mjs',
    plugins: [
        json(),
        resolve({
            modulesOnly: true,
        }),
    ],
    output: {
        file: 'dist/index.js',
        format: 'cjs',
        name: '@shome/ebus-client',
    },
};