import path from "node:path";
import { app } from "electron";
import { create, type Whatsapp, type Message } from "@wppconnect-team/wppconnect";
import log from "electron-log/main";
import { getDb } from "../../db/client";
import { sendToRenderer } from "../../ipc/broadcast";
import { IPC_CHANNELS } from "../../../shared/ipc-contracts";
import type { SessionStatus } from "../../../shared/types";

const clients = new Map<string, Whatsapp>();

export function getClient(sessionId: string): Whatsapp | undefined {
  return clients.get(sessionId);
}

function getTokensDir(): string {
  return path.join(app.getPath("userData"), "wpp-tokens");
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

  const client = await create({
    session: sessionId,
    folderNameToken: getTokensDir(),
    // Use Puppeteer's own bundled Chromium rather than depending on the
    // end user having a system Chrome install.
    useChrome: false,
    headless: true,
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

/** Reconnects sessions that were connected (or mid-QR) when the app last closed. */
export async function restoreSessions(): Promise<void> {
  const db = getDb();
  const sessions = await db.session.findMany({
    where: { status: { in: ["connected", "qr", "pending"] } },
  });
  for (const session of sessions) {
    startSession(session.id).catch((err) =>
      log.error(`[wpp] failed to restore session ${session.id}`, err),
    );
  }
}
