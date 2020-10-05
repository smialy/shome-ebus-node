import commander from "commander";

// import pkg from '../package.json';
import * as commands from "./commands/index.mjs";
import { setupExceptionHandler } from "./utils/errors.mjs";
import { readSettings } from "./settings/settings.mjs";

commander
  .command("ebus")
  .option("--settings <settings>", "Path to settings file", "")

  .action(async (options) => {
    const settings = await readSettings(options.settings);
    commands.ebus(settings);
  });

commander
  .command("exporter")
  .option("--settings <settings>", "Path to settings file", "")

  .action(async (options) => {
    const settings = await readSettings(options.settings);
    commands.exporter(settings);
  });

// commander.version(pkg.version)
// .usage('[cmd]');

async function readConfigFile(configFile) {}

(function run() {
  setupExceptionHandler();
  commander.parse(process.argv);
  if (process.argv.length == 2) {
    commander.outputHelp();
  }
})();
