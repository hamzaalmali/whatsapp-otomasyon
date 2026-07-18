import path from "node:path";
import { app } from "electron";
import { create, type Whatsapp, type Message } from "@wppconnect-team/wppconnect";
import { computeExecutablePath, detectBrowserPlatform, Browser } from "@puppeteer/browsers";
// PUPPETEER_REVISIONS exists at runtime but isn't part of puppeteer-core's
// public .d.ts surface, so it has to be pulled off the module manually.
import * as puppeteerCore from "puppeteer-core";
const { PUPPETEER_REVISIONS } = puppeteerCore as unknown as {
  PUPPETEER_REVISIONS: Readonly<{ chrome: string }>;
};
import log from "electron-log/main";
import { getDb } from "../../db/client";
import { sendToRenderer } from "../../ipc/broadcast";
import { IPC_CHANNELS } from "../../../shared/ipc-contracts";
import type { SessionStatus } from "../../../shared/types";

const clients = new Map<string, Whatsapp>();
// Sessions the user explicitly stopped/removed — checked after a failed
// create() so we don't auto-retry a QR flow the user just cancelled.
const stopping = new Set<string>();
// Consecutive QR-timeout failures per session, so a persistently broken
// environment (e.g. no usable Chromium) can't spin an infinite retry loop.
const retryCounts = new Map<string, number>();
// Kept low and spaced out on purpose: WhatsApp's abuse detection flags
// accounts that see a burst of rapid device-link attempts from an
// unofficial client, independent of whether any message was ever sent.
// Fewer, slower retries look less like automated pairing spam.
const MAX_QR_RETRIES = 3;
const QR_RETRY_DELAY_MS = 15_000;

export function getClient(sessionId: string): Whatsapp | undefined {
  return clients.get(sessionId);
}

function getTokensDir(): string {
  return path.join(app.getPath("userData"), "wpp-tokens");
}

/**
 * Packaged builds don't have puppeteer's dev-only postinstall download
 * (~/.cache/puppeteer) available, so a bundled Chrome is shipped as an
 * extraResource instead (see scripts/download-chrome.mjs) and resolved
 * here. In dev, returning undefined lets puppeteer fall back to its own
 * normal cache-dir resolution, unchanged.
 */
function getBundledChromePath(): string | undefined {
  if (!app.isPackaged) return undefined;

  const platform = detectBrowserPlatform();
  if (!platform) {
    log.error("[wpp] could not detect browser platform for bundled Chrome");
    return undefined;
  }

  return computeExecutablePath({
    cacheDir: path.join(process.resourcesPath, "chrome-cache"),
    browser: Browser.CHROME,
    buildId: PUPPETEER_REVISIONS.chrome,
    platform,
  });
}

async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
  extra: { qrCode?: string | null; phoneNumber?: string | null } = {},
): Promise<void> {
  const db = getDb();
  const updated = await db.session.update({
    where: { id: sessionId },
    data: {
      status,
      ...(extra.qrCode !== undefined ? { qrCode: extra.qrCode } : {}),
      ...(extra.phoneNumber !== undefined ? { phoneNumber: extra.phoneNumber } : {}),
      ...(status === "connected" ? { lastConnectedAt: new Date() } : {}),
    },
  });
  sendToRenderer(IPC_CHANNELS.sessionsStatusEvent, {
    sessionId,
    status,
    phoneNumber: updated.phoneNumber,
  });
}

async function handleIncomingMessage(sessionId: string, message: Message): Promise<void> {
  if (message.fromMe || message.isGroupMsg) return;

  const phone = (message.from ?? "").replace(/@c\.us$/, "");
  if (!phone) return;

  const db = getDb();
  const contact = await db.contact.upsert({
    where: { phone },
    update: {},
    create: { phone, name: message.sender?.pushname ?? null },
  });

  const conversation = await db.conversation.upsert({
    where: { contactId_sessionId: { contactId: contact.id, sessionId } },
    update: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
    create: { contactId: contact.id, sessionId, lastMessageAt: new Date(), unreadCount: 1 },
  });

  await db.message.create({
    data: {
      conversationId: conversation.id,
      direction: "in",
      type: message.type === "chat" ? "text" : (message.type ?? "other"),
      body: message.body ?? null,
      status: "delivered",
      wppMessageId: message.id ?? null,
    },
  });
}

export async function startSession(sessionId: string): Promise<void> {
  if (clients.has(sessionId)) return;
  stopping.delete(sessionId);

  let client: Whatsapp;
  try {
    client = await create({
      session: sessionId,
      folderNameToken: getTokensDir(),
      // Use Puppeteer's own Chromium rather than depending on the end user
      // having a system Chrome install.
      useChrome: false,
      headless: true,
      puppeteerOptions: { executablePath: getBundledChromePath() },
      catchQR: (qrCode, _asciiQR, attempt) => {
        updateSessionStatus(sessionId, "qr", { qrCode }).catch((err) =>
          log.error(`[wpp:${sessionId}] failed to persist QR`, err),
        );
        sendToRenderer(IPC_CHANNELS.sessionsQrEvent, { sessionId, qrDataUrl: qrCode, attempt });
      },
      statusFind: (status) => {
        log.info(`[wpp:${sessionId}] status: ${status}`);
        if (status === "browserClose" || status === "qrReadFail" || status === "qrReadError") {
          updateSessionStatus(sessionId, "disconnected").catch((err) =>
            log.error(`[wpp:${sessionId}] failed to persist status`, err),
          );
        }
      },
    });
  } catch (err) {
    if (stopping.delete(sessionId)) {
      log.info(`[wpp:${sessionId}] stopped before connecting, not retrying`);
      return;
    }

    const retries = (retryCounts.get(sessionId) ?? 0) + 1;
    retryCounts.set(sessionId, retries);
    if (retries > MAX_QR_RETRIES) {
      log.error(`[wpp:${sessionId}] gave up after ${retries} failed QR attempts`, err);
      retryCounts.delete(sessionId);
      await updateSessionStatus(sessionId, "disconnected").catch((updateErr) =>
        log.error(`[wpp:${sessionId}] failed to persist give-up status`, updateErr),
      );
      throw err;
    }

    log.warn(`[wpp:${sessionId}] QR not scanned in time (attempt ${retries}/${MAX_QR_RETRIES}), retrying`, err);
    await new Promise((resolve) => setTimeout(resolve, QR_RETRY_DELAY_MS));
    return startSession(sessionId);
  }

  retryCounts.delete(sessionId);
  clients.set(sessionId, client);

  const wid = await client.getWid().catch(() => null);
  await updateSessionStatus(sessionId, "connected", {
    qrCode: null,
    phoneNumber: wid ? wid.replace(/@c\.us$/, "") : null,
  });

  client.onMessage((message) => {
    handleIncomingMessage(sessionId, message).catch((err) =>
      log.error(`[wpp:${sessionId}] failed to persist incoming message`, err),
    );
  });

  client.onStateChange((state) => {
    log.info(`[wpp:${sessionId}] state: ${state}`);
    if (state === "CONFLICT" || state === "UNPAIRED" || state === "UNPAIRED_IDLE") {
      updateSessionStatus(sessionId, "disconnected").catch((err) =>
        log.error(`[wpp:${sessionId}] failed to persist state`, err),
      );
    }
  });
}

/**
 * Closes the browser but keeps the auth token/profile directory on disk, so
 * the next startSession() for this id reconnects without a new QR scan.
 */
export async function stopSession(sessionId: string, options: { logout?: boolean } = {}): Promise<void> {
  stopping.add(sessionId);
  retryCounts.delete(sessionId);
  const client = clients.get(sessionId);
  if (!client) return;

  if (options.logout) {
    await client.logout().catch((err) => log.error(`[wpp:${sessionId}] logout failed`, err));
  } else {
    await client.close().catch((err) => log.error(`[wpp:${sessionId}] close failed`, err));
  }
  clients.delete(sessionId);
}

export async function closeAllSessions(): Promise<void> {
  await Promise.all([...clients.keys()].map((id) => stopSession(id)));
}

/**
 * Reconnects sessions that were actually connected when the app last
 * closed. Sessions still stuck on "qr"/"pending" are deliberately NOT
 * auto-retried — retrying a pairing that never completed on every app
 * launch is exactly the kind of repeated device-link burst that gets
 * WhatsApp accounts flagged. They're marked disconnected instead (there's
 * no live client behind that stale QR after a restart anyway), so the UI
 * shows a "Yeniden bağlan" button the user can click when they're ready.
 */
export async function restoreSessions(): Promise<void> {
  const db = getDb();

  const stale = await db.session.findMany({ where: { status: { in: ["qr", "pending"] } } });
  for (const session of stale) {
    await updateSessionStatus(session.id, "disconnected").catch((err) =>
      log.error(`[wpp] failed to mark stale session ${session.id} disconnected`, err),
    );
  }

  const connected = await db.session.findMany({ where: { status: "connected" } });
  for (const session of connected) {
    startSession(session.id).catch((err) =>
      log.error(`[wpp] failed to restore session ${session.id}`, err),
    );
  }
}
