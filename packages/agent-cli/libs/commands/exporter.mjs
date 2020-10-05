import koa from "koa";
import Router from "koa-router";
import Mqtt from "../mqtt.mjs";

// import koaBody from 'koa-body';

const SHUTDOWN_EVENTS = ["SIGINT", "SIGTERM", "SIGQUIT"];

export async function exporter(settings) {
  const metrics = new Metrics();

  const mq = new Mqtt(settings.mqtt);
  await mq.connect();
  console.log("Connected to mqtt");

  mq.subscribe("ebus/#", ({ topic, payload: value }) => {
    const [_, circuit, field] = topic.split("/");
    metrics.update(`ebus_sensor_${field}`, value, { circuit });
  });

  mq.subscribe("zigbee2mqtt/+", ({ topic, payload }) => {
    const FIELDS = [
      "battery",
      "humidity",
      "linkquality",
      "pressure",
      "temperature",
      "voltage",
    ];
    const [_, device] = topic.split("/");
    for (const [field, value] of Object.entries(payload)) {
      if (FIELDS.includes(field)) {
        metrics.update(`zigbee_sensor_${field}`, value, { device });
      }
    }
  });

  const app = new koa();
  let api = new Router({
    prefix: "/api",
  });
  api.get("/metrics", async (ctx) => {
    const labels = { node: settings.general.node_name };
    ctx.body = toPrometheusMetrics(metrics.get(), labels);
  });

  app.use(api.routes(), api.allowedMethods());
  app.use(async function (ctx) {
    ctx.body = "Agent - OK";
  });

  const { host, port } = settings.exporter;
  const server = app.listen(port, host);
  installShutdown(async () => {
    console.log("Shutdown...");
    server.close((err) => console.error(err));
    process.exit(0);
  });
  console.log(`Running on http://${host}:${port}/ (Press CTRL+C to quit)`);
}

const installShutdown = (shoutdown) =>
  SHUTDOWN_EVENTS.map((event) => process.on(event, shoutdown));

class Metrics {
  constructor() {
    this.metrics = new Map();
  }
  update(name, value, labels = {}, type = "gauge") {
    const key = `${name}${preapreLabels(labels)}`;
    this.metrics.set(key, {
      time: new Date().getTime(),
      name,
      value,
      labels,
      // description,
      type,
    });
  }
  get() {
    return this.metrics.values();
  }
}

function preapreLabels(...args) {
  const labels = {};
  for (const arg of args) {
    if (arg && typeof args === "object") {
      Object.assign(labels, arg);
    }
  }
  const items = Object.entries(labels).map(
    ([name, value]) => `${name}="${value}"`
  );
  return items.length ? `{${items.join(",")}}` : "";
}

function toPrometheusMetrics(metrics, labels = {}) {
  const groups = groupByName(metrics);
  const buff = [];
  for (const [name, meta] of Object.entries(groups)) {
    if (meta.description) {
      buff.push(`# HELP ${name} ${meta.description}`);
    }
    if (meta.type) {
      buff.push(`# TYPE ${name} ${meta.type}`);
    }
    for (const metric of meta.items) {
      const textLabels = preapreLabels(labels, metric.labels);
      buff.push(`${name}${textLabels} ${convertValue(metric.value)}`);
    }
  }
  return buff.join("\n");
}

function groupByName(metrics) {
  const buff = {};

  for (const metric of metrics) {
    if (!metric) {
      continue;
    }
    if (!buff[metric.name]) {
      buff[metric.name] = {
        items: [],
        type: metric.type || "",
        description: metric.description || "",
      };
    }
    buff[metric.name].items.push({
      time: metric.time,
      value: metric.value,
      labels: metric.labels || [],
    });
  }
  return buff;
}

function convertValue(value) {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return value;
}
