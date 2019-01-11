# @shome/agent-cli

    Simple metrics exporter for [prometheus](http://prometheus.io/). Export some node and [ebusd](https://github.com/john30/ebusd) params. 

## Installation

    $ npm install --global @shome/agent-cli 

## Usage
Start ebus metrics exporter with ebus option.
    
    $ shome-agent start <node-name> --enable-ebus --ebus-host <host-name>

## Flags
    
    $ shome-agent --help

```bash
Usage: cli.mjs [cmd]

Options:
-V, --version               output the version number
-h, --help                  output usage information

Commands:
start [options] <nodeName>
```
    $ shome-agent start --help

```bash
Usage: start [options] <nodeName>

Options:
--host <host>             metric exporter host (default: "localhost")
--port <port>             metric exporter port (default: 9091)
--node-fs <names>         node fs names (default: "*")
--enable-ebus             enable ebus service
--ebus-host <host>        ebus service host (default: "localhost")
--ebus-port <port>        ebus service port (default: 8888)
--ebus-interval <second>  ebus read interval (default: 60)
-h, --help                output usage information
```

## License

MIT