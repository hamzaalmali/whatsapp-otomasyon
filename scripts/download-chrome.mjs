import path from "node:path";
import { install, detectBrowserPlatform, Browser } from "@puppeteer/browsers";
import { PUPPETEER_REVISIONS } from "puppeteer-core";

// wppconnect launches Puppeteer's own Chrome (not a system browser), but
// that Chrome is normally downloaded as a dev-machine convenience via
// puppeteer's postinstall script into a per-user cache dir (~/.cache/puppeteer)
// — which doesn't exist on an end user's machine after installing the
// packaged app. Download it into resources/chrome-cache instead, so
// electron-builder's extraResources ships it inside the app, and
// session-manager.ts points puppeteerOptions.executablePath at this bundled
// copy when app.isPackaged.
//
// Must run AFTER prepare-resources.mjs (which wipes and rebuilds resources/).

const cacheDir = path.resolve(import.meta.dirname, "..", "resources", "chrome-cache");
const buildId = PUPPETEER_REVISIONS.chrome;

const platform = detectBrowserPlatform();
if (!platform) {
  throw new Error("[download-chrome] Could not detect a supported browser platform");
}

await install({
  cacheDir,
  browser: Browser.CHROME,
  buildId,
  platform,
});

console.log(`[download-chrome] Chrome ${buildId} (${platform}) ready at ${cacheDir}`);
