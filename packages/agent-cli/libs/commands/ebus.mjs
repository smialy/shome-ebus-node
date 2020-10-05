import EbusReader from "../ebus.mjs";
import Mqtt from "../mqtt.mjs";
import { AsyncStream } from "../utils/streams.mjs";

const SHUTDOWN_EVENTS = ["SIGINT", "SIGTERM", "SIGQUIT"];

class Meno {}

export async function ebus(settings) {
  const mq = new Mqtt(settings.mqtt);
  await mq.connect();
  console.log("Connected to mqtt");

  const stream = new AsyncStream();
  const runner = new PeriodRunner(
    stream,
    new EbusReader(settings.ebus),
    settings.ebus.interval
  );
  runner.start();
  mq.subscribe("shome/ebus/command", ({ payload: { name } }) => {
    switch (name) {
      case "state":
        runner.run(true);
        break;
      default:
        console.log(`Noy found command: ${name}`);
    }
  });

  for await (const { circuit, field, value } of stream) {
    const topic = `ebus/${circuit}/${field}`;
    console.log(`Publish topic: ${topic}`);
    mq.publish(topic, JSON.stringify(value));
  }

  installShutdown(async () => {
    console.log("Shutdown...");
    runner.stop();
    stream.close();
    server.close((err) => console.error(err));
    process.exit(0);
  });
}

const installShutdown = (shoutdown) =>
  SHUTDOWN_EVENTS.map((event) => process.on(event, shoutdown));

class PeriodRunner {
  constructor(stream, producer, interval) {
    this.interval = interval * 1000;
    this.stream = stream;
    this.producer = producer;
    this.running = false;
    this.active = false;
  }
  start() {
    this.active = true;
    this.timer = setTimeout(() => this.run());
  }
  stop() {
    this.active = false;
  }
  async run(force = false) {
    if (!this.active) {
      return;
    }
    if (this.running) {
      return;
    }
    this.running = true;
    clearTimeout(this.timer);
    await this.stream.fromStream(this.producer.produce(force));
    this.running = false;
    setTimeout(() => this.run(), this.interval);
  }
}
