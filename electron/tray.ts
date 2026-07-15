import { Tray, Menu, nativeImage, app } from "electron";
import path from "node:path";

let tray: Tray | null = null;

export function createTray(onShow: () => void): Tray {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "build", "tray-icon.png")
    : path.join(app.getAppPath(), "build", "tray-icon.png");

  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip("WhatsApp Otomasyon");

  const menu = Menu.buildFromTemplate([
    { label: "Aç", click: onShow },
    { type: "separator" },
    { label: "Çıkış", click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on("click", onShow);

  return tray;
}
