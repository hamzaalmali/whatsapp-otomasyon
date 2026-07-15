import { ipcMain } from "electron";
import { IPC_CHANNELS, type PingResponse } from "../../shared/ipc-contracts";
import { getDb } from "../db/client";

export function registerSystemIpc(): void {
  ipcMain.handle(IPC_CHANNELS.systemPing, async (): Promise<PingResponse> => {
    const db = getDb();
    await db.systemPing.create({ data: {} });
    const dbRowCount = await db.systemPing.count();

    return {
      message: "pong",
      dbRowCount,
      respondedAt: new Date().toISOString(),
    };
  });
}
