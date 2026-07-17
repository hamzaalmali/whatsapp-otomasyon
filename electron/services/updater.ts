import { autoUpdater } from "electron-updater";
import log from "electron-log/main";
import { IPC_CHANNELS } from "../../shared/ipc-contracts";
import type { UpdateStatusEvent } from "../../shared/types";
import { sendToRenderer } from "../ipc/broadcast";

let initialized = false;

function emit(event: UpdateStatusEvent): void {
  sendToRenderer(IPC_CHANNELS.updatesStatusEvent, event);
}

export function initAutoUpdater(): void {
  if (initialized) return;
  initialized = true;

  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => emit({ status: "checking" }));
  autoUpdater.on("update-available", (info) =>
    emit({ status: "available", version: info.version }),
  );
  autoUpdater.on("update-not-available", () => emit({ status: "not-available" }));
  autoUpdater.on("download-progress", (progress) =>
    emit({ status: "downloading", percent: Math.round(progress.percent) }),
  );
  autoUpdater.on("update-downloaded", (info) =>
    emit({ status: "downloaded", version: info.version }),
  );
  autoUpdater.on("error", (error) => {
    log.error("Auto-update error", error);
    emit({ status: "error", message: error.message });
  });
}

export async function checkForUpdates(): Promise<void> {
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    log.error("checkForUpdates failed", error);
  }
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}
