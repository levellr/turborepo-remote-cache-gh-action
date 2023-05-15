import { spawn } from "child_process";
import {
  saveState,
  info,
  setFailed,
  debug,
  exportVariable,
} from "@actions/core";
import { resolve } from "path";
import { waitUntilUsed } from "tcp-port-used";
import { existsSync, mkdirSync } from "fs";
import { logDir } from "./constants";
import { storagePath, storageProvider, teamId, token } from "./inputs";

let retries = 0;

async function main() {
  if (!existsSync(logDir)) {
    debug(`Creating log directory: "${logDir}"...`);
    mkdirSync(logDir, { recursive: true });
  }

  await startTurboCacheServerWithRetries();
}

async function startTurboCacheServerWithRetries() {
  const port = 3333;

  debug(`Export environment variables...`);
  exportVariable("TURBO_API", `http://127.0.0.1:${port}`);
  exportVariable("TURBO_TOKEN", token);
  exportVariable("TURBO_TEAM", teamId);

  debug(`Starting Turbo Cache Server...`);

  const subprocess = spawn("node", [resolve(__dirname, "../start_and_log")], {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      PORT: port.toString(),
      TURBO_TOKEN: token,
      STORAGE_PROVIDER: storageProvider,
      STORAGE_PATH: storagePath,
    },
  });

  const pid = subprocess.pid?.toString();
  subprocess.unref();

  try {
    debug(`Waiting for port ${port} to be used...`);
    await waitUntilUsed(port, 250, 5000);

    info("Spawned Turbo Cache Server:");
    info(`  PID: ${pid}`);
    info(`  Listening on port: ${port}`);
    saveState("pid", subprocess.pid?.toString());
  } catch (e) {
    console.error(`Turbo server failed to start on port: ${port}. Error: ${e}`);
    if (retries < 5) {
      retries++;
      console.log(`Attempt number ${retries + 1}. Retrying...`);
      await startTurboCacheServerWithRetries();
    } else {
      throw new Error(
        `Couldn't start Turbo Repo Cache server after 5 attempts. See error details above.`
      );
    }
  }
}

main().catch(setFailed);
