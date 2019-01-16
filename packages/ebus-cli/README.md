# @shome/ebus-cli

Command Line Utility for [ebusd](https://github.com/john30/ebusd) 

## Installation

    $ npm install --global @shome/ebus-cli 

## Usage
    
Read all registers from device: "bai" (Vaillant)

```sh    
shome-ebus read-all bai
```

Read one register: "ReturnTemp" from device: "bai" (Vaillant)

```sh
shome-ebus read bai ReturnTemp
```

## Flags
```sh
shome-ebus --help
```
## License

MIT