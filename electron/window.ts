import { BrowserWindow, shell } from "electron";
import path from "node:path";
import log from "electron-log/main";

export function createMainWindow(url: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: "WhatsApp Otomasyon",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  win.webContents.on("preload-error", (_event, preloadPath, error) => {
    log.error(`Preload script failed to load: ${preloadPath}`, error);
  });

  // Any link/navigation that isn't our own local renderer origin opens in the
  // system browser instead of inside the app window.
  win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, targetUrl) => {
    if (!targetUrl.startsWith(url)) {
      event.preventDefault();
      shell.openExternal(targetUrl);
    }
  });

  win.loadURL(url);

  return win;
}
