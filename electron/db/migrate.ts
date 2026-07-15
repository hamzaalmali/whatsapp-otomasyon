import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { app } from "electron";
import log from "electron-log/main";

function getMigrationsDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "prisma-migrations")
    : path.join(app.getAppPath(), "prisma", "migrations");
}

/**
 * Hand-rolled migration runner: applies prisma/migrations/*\/migration.sql
 * files in order, tracked in an `_app_migrations` table. Deliberately does
 * NOT shell out to the Prisma CLI/migration engine — packaged Electron apps
 * shouldn't bundle or invoke that tooling at runtime.
 */
export function runMigrations(dbPath: string): void {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS _app_migrations (
      name TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `);

  const migrationsDir = getMigrationsDir();
  const migrationNames = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const appliedRows = db.prepare("SELECT name FROM _app_migrations").all() as Array<{
    name: string;
  }>;
  const applied = new Set(appliedRows.map((row) => row.name));

  const insertApplied = db.prepare("INSERT INTO _app_migrations (name, applied_at) VALUES (?, ?)");

  for (const name of migrationNames) {
    if (applied.has(name)) continue;

    const sqlPath = path.join(migrationsDir, name, "migration.sql");
    if (!fs.existsSync(sqlPath)) continue;

    const sql = fs.readFileSync(sqlPath, "utf8");
    log.info(`[migrate] applying ${name}`);

    const applyMigration = db.transaction(() => {
      db.exec(sql);
      insertApplied.run(name, Date.now());
    });
    applyMigration();
  }

  db.close();
}
