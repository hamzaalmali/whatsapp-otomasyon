import { app, BrowserWindow } from "electron";
import log from "electron-log/main";
import { createMainWindow } from "./window";
import { createTray } from "./tray";
import { startNextServer, stopNextServer } from "./next-runtime";
import { runMigrations } from "./db/migrate";
import { getDbPath } from "./db/client";
import { registerIpcHandlers } from "./ipc";
import { registerMainWindow } from "./ipc/broadcast";
import { restoreSessions, closeAllSessions } from "./services/whatsapp/session-manager";
import { resumeRunningCampaigns } from "./services/campaigns/campaign-worker";
import { initAutoUpdater, checkForUpdates } from "./services/updater";

const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

log.initialize();
log.transports.file.level = "info";

let mainWindow: BrowserWindow | null = null;
let allowQuit = false;

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      runMigrations(getDbPath());
      registerIpcHandlers();

      const rendererUrl = app.isPackaged
        ? await startNextServer()
        : (process.env.ELECTRON_RENDERER_URL ?? "http://localhost:3000");

      mainWindow = createMainWindow(rendererUrl);
      registerMainWindow(mainWindow);

      mainWindow.on("close", (event) => {
        if (!allowQuit) {
          event.preventDefault();
          mainWindow?.hide();
        }
      });

      createTray(() => {
        mainWindow?.show();
        mainWindow?.focus();
      });

      restoreSessions().catch((error) => log.error("Failed to restore sessions", error));
      resumeRunningCampaigns().catch((error) => log.error("Failed to resume campaigns", error));

      if (app.isPackaged) {
        initAutoUpdater();
        checkForUpdates();
        setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL_MS);
      }
    } catch (error) {
      log.error("Failed to start application", error);
      app.quit();
    }
  });

  app.on("before-quit", async (event) => {
    if (allowQuit) return;
    event.preventDefault();
    allowQuit = true;
    await closeAllSessions().catch((error) => log.error("Failed to close sessions", error));
    stopNextServer();
    app.quit();
  });

  app.on("window-all-closed", () => {
    // Intentional no-op: the window's own "close" handler hides it instead of
    // destroying it, so the app stays alive via the tray icon — long-running
    // campaigns must survive the user closing the window.
  });

  app.on("activate", () => {
    mainWindow?.show();
  });
}
