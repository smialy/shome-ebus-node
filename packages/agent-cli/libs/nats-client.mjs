import NATS from "nats";

export default class NatsClient {
  constructor(settings) {
    this.settings = settings;
  }
  connect() {
    return new Promise((resolve, reject) => {
      const { host, port, token } = this.settings;
      const options = {
        url: `nats://${host}:${port}`,
        token,
        json: true,
      };
      this.client = NATS.connect(options);
      const timer = setTimeout(() => {
        this.client.close();
        reject(`Problem with connect to: ${options.url}`);
      }, 1000);
      this.client.on("connect", (nc) => {
        clearTimeout(timer);
        resolve();
      });

      this.client.on("disconnect", () => {
        console.log("disconnect");
      });

      this.client.on("close", function () {
        console.log("nats close");
      });

      this.client.on("permission_error", function (err) {
        console.error("got a permissions error", err.message);
      });
    });
  }
  disconnect() {
    if (this.client) {
      this.client.close();
    }
  }
  subscribe(topic, handler) {
    const sid = this.client.subscribe(topic, handler);
    return () => this.client.unsubscribe(sid);
  }
  register(topic, hander) {
    const sid = this.client.subscribe(topic, async (payload, reply) => {
      const result = await hander(payload);
      if (reply) {
        this.client.publish(reply, result);
      }
    });
    return () => this.client.unsubscribe(sid);
  }
  call(topic, data) {
    return new Promise((resolve, reject) => {
      this.client.request(topic, data, (msg) => {
        if (msg instanceof NATS.NatsError && msg.code === NATS.REQ_TIMEOUT) {
          reject(msg);
        } else {
          resolve(msg);
        }
      });
    });
  }
  publish(topic, payload) {
    this.client.publish(topic, payload);
  }
}
