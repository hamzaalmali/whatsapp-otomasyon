import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { app } from "electron";
import log from "electron-log/main";

let serverProcess: ChildProcess | null = null;

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (address && typeof address === "object") {
        const { port } = address;
        probe.close(() => resolve(port));
      } else {
        probe.close(() => reject(new Error("Could not determine a free port")));
      }
    });
  });
}

function waitForServerReady(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() > deadline) {
            reject(new Error(`Next.js standalone server did not become ready at ${url}`));
            return;
          }
          setTimeout(attempt, 150);
        });
    };
    attempt();
  });
}

/**
 * Boots the Next.js `output: 'standalone'` server as a child process on a free
 * local port and returns the URL to load. Spawned via `process.execPath`
 * (Electron's own binary) with ELECTRON_RUN_AS_NODE so the packaged app never
 * depends on a system Node.js install.
 */
export async function startNextServer(): Promise<string> {
  const port = await getFreePort();
  const url = `http://127.0.0.1:${port}`;

  const standaloneDir = app.isPackaged
    ? path.join(process.resourcesPath, "next-standalone")
    : path.join(app.getAppPath(), ".next", "standalone");
  const serverEntry = path.join(standaloneDir, "server.js");

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      ELECTRON_RUN_AS_NODE: "1",
    },
    stdio: "pipe",
  });

  serverProcess.stdout?.on("data", (chunk: Buffer) => log.info(`[next] ${chunk.toString().trim()}`));
  serverProcess.stderr?.on("data", (chunk: Buffer) => log.error(`[next] ${chunk.toString().trim()}`));
  serverProcess.on("exit", (code) => log.warn(`[next] standalone server exited with code ${code}`));

  await waitForServerReady(url, 15_000);
  return url;
}

export function stopNextServer(): void {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
    serverProcess = null;
  }
}
