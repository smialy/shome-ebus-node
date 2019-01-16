# @shome/ebus-client

    Node.js client for [ebusd](https://github.com/john30/ebusd) 

## Installation

    $ npm install @shome/ebus-client --save

## Usage
    

#### Creating client
```js
import EBusClient from '@shome/ebus-client';

const client = new EBusClient({
    host: <host>,
    port: <port>,
});
```

Run ebus command `find`:
```js
const response = await client.find();
```
   
> Response will be string.

#### Read all registers from device `bai`. 
```js
for await (const [name, value] from client.readAll('bai')) {
    ...
}
> Response is async generator.

## License

MIT