import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc-contracts";
import { checkForUpdates, quitAndInstall } from "../services/updater";

export function registerUpdatesIpc(): void {
  ipcMain.handle(IPC_CHANNELS.updatesCheck, async (): Promise<void> => {
    await checkForUpdates();
  });

  ipcMain.handle(IPC_CHANNELS.updatesInstall, (): void => {
    quitAndInstall();
  });
}
