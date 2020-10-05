import mqtt from "mqtt";

export default class MqttClient {
  constructor(settings) {
    this.settings = settings;
    this.subscriptions = [];
  }
  connect() {
    const { host, port, username, password } = this.settings;

    return new Promise((resolve, reject) => {
      const options = {
        username,
        password,
      };
      const url = `mqtt://${host}:${port}`;
      const timer = setTimeout(() => {
        this.client.end();
        reject("Timeout");
      }, 2000);
      this.client = mqtt.connect(url, options);
      this.client.on("connect", () => {
        clearTimeout(timer);
        resolve();
      });
      this.client.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      this.client.on("message", (topic, payload) =>
        this._messageHandler(topic, payload)
      );
    });
  }
  disconnect() {
    this.client.end();
  }
  publish(topic, payload) {
    const options = { qos: 0, retain: false };
    return new Promise((resolve) =>
      this.client.publish(topic, payload, options, resolve)
    );
  }
  subscribe(topic, handler) {
    this.subscriptions.push({
      topic,
      handler,
      resolver: topicResolver(topic),
    });
    return new Promise((resolve, reject) => {
      this.client.subscribe(topic, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  _messageHandler(topic, payload) {
    if (payload instanceof Buffer) {
      payload = payload.toString();
    }
    const handlers = this.resolveHandlers(topic);
    if (handlers.length) {
      try {
        if (payload.length) {
          payload = JSON.parse(payload);
        }
        for (const handler of handlers) {
          handler({ topic, payload });
        }
      } catch (e) {
        console.error(e);
      }
    }
  }
  resolveHandlers(topic) {
    return this.subscriptions
      .filter((sub) => sub.resolver(topic))
      .map((sub) => sub.handler);
  }
}
function topicResolver(rule) {
  if (rule.includes("#")) {
    return (topic) => topic.indexOf(rule.substr(0, rule.length - 2)) === 0;
  }
  if (rule.includes("+")) {
    return (topic) => {
      const tp = topic.split("/");
      const rp = rule.split("/");
      for (let i = 0; i < tp.length; i += 1) {
        if (rp[i] === "+") {
          continue;
        }
        if (rp[i] !== tp[i]) {
          return false;
        }
      }
      return true;
    };
  }
  return (topic) => rule === topic;
}
