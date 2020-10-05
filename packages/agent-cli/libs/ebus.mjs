import EBusClient from "@shome/ebus-client";

export default class EbusReader {
  constructor(settings) {
    this.settings = settings;
    this.unique = new Map();
  }
  async *produce(force = false) {
    const client = this.getClient();
    try {
      for (const { circuit, fields } of this.settings.devices) {
        const items = client.readMany(circuit, fields);
        for await (const [field, value] of items) {
          const key = `${circuit}/${field}`;
          if (
            force ||
            !this.unique.has(key) ||
            this.unique.get(key) !== value
          ) {
            this.unique.set(key, value);
            yield {
              circuit,
              field: normalize(field),
              value,
              time: Math.round(new Date().getTime() / 1000),
            };
          }
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }
  [Symbol.asyncIterator]() {
    return this.produce();
  }
  getClient() {
    if (!this._client) {
      const { host, port } = this.settings;
      this._client = new EBusClient({ host, port });
    }
    return this._client;
  }
}
function normalize(text) {
  return text
    .replace(/[A-Z]/g, (match) => "_" + match.charAt(0).toLowerCase())
    .replace(/^_/, "");
}
