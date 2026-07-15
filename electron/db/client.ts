import path from "node:path";
import { app } from "electron";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../generated/prisma/client";

let prisma: PrismaClient | null = null;

export function getDbPath(): string {
  return path.join(app.getPath("userData"), "whatsapp-otomasyon.db");
}

export function getDb(): PrismaClient {
  if (!prisma) {
    const adapter = new PrismaBetterSqlite3({ url: `file:${getDbPath()}` });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}
