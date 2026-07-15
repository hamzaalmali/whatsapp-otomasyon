import { ipcMain } from "electron";
import log from "electron-log/main";
import { IPC_CHANNELS } from "../../shared/ipc-contracts";
import type { SessionDTO } from "../../shared/types";
import { getDb } from "../db/client";
import { startSession, stopSession } from "../services/whatsapp/session-manager";

function toDTO(session: {
  id: string;
  name: string;
  phoneNumber: string | null;
  status: string;
  qrCode: string | null;
  createdAt: Date;
  lastConnectedAt: Date | null;
}): SessionDTO {
  return {
    id: session.id,
    name: session.name,
    phoneNumber: session.phoneNumber,
    status: session.status as SessionDTO["status"],
    qrCode: session.qrCode,
    createdAt: session.createdAt.toISOString(),
    lastConnectedAt: session.lastConnectedAt?.toISOString() ?? null,
  };
}

export function registerSessionsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.sessionsList, async (): Promise<SessionDTO[]> => {
    const db = getDb();
    const sessions = await db.session.findMany({ orderBy: { createdAt: "asc" } });
    return sessions.map(toDTO);
  });

  ipcMain.handle(IPC_CHANNELS.sessionsCreate, async (_event, name: string): Promise<SessionDTO> => {
    const db = getDb();
    const session = await db.session.create({ data: { name } });
    startSession(session.id).catch((err) => log.error(`[wpp:${session.id}] failed to start`, err));
    return toDTO(session);
  });

  ipcMain.handle(IPC_CHANNELS.sessionsRemove, async (_event, id: string): Promise<void> => {
    await stopSession(id, { logout: true });
    const db = getDb();
    await db.session.delete({ where: { id } });
  });
}
