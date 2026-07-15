import type { BrowserWindow } from "electron";
import type { IpcEventPayloads } from "../../shared/ipc-contracts";

let mainWindow: BrowserWindow | null = null;

export function registerMainWindow(win: BrowserWindow): void {
  mainWindow = win;
}

export function sendToRenderer<K extends keyof IpcEventPayloads>(
  channel: K,
  payload: IpcEventPayloads[K],
): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}
