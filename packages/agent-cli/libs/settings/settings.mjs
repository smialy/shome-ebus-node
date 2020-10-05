import os from "os";
import Path from "path";
import fs from "fs";
import Utils from "util";
import yaml from "js-yaml";

const CONFIG_FILE = "shome-agent.yaml";

const readFile = Utils.promisify(fs.readFile);

const File = {
  stat: Utils.promisify(fs.stat),
  read(path, encoding = "utf-8") {
    return readFile(path, encoding);
  },
  async exists(path) {
    try {
      await File.stat(path);
    } catch (e) {
      console.log(e);
      return false;
    }
    return true;
  },
};

async function findSettingsFile(path) {
  const dirs = [path, process.cwd(), os.homedir()].filter((p) => p);

  for (const dir of dirs) {
    const filePath = Path.join(dir, CONFIG_FILE);
    if (await File.exists(filePath)) {
      return filePath;
    }
  }
  throw new Error(`Not found config file: ${CONFIG_FILE} (${dirs.join(", ")})`);
}

export async function readSettings() {
  const settingFile = await findSettingsFile();
  console.log(`Load config: ${settingFile}`);
  const data = await File.read(settingFile);
  return await yaml.load(data);
}
