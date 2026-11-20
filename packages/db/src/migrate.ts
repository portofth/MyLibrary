import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { DatabaseConnection } from './client';

export const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations', import.meta.url));

/** Number of migrations shipped with the code that the database has not applied yet. */
export function pendingMigrationCount(conn: DatabaseConnection): number {
  const journal = JSON.parse(readFileSync(`${MIGRATIONS_DIR}/meta/_journal.json`, 'utf8')) as {
    entries: unknown[];
  };
  const hasTable = conn.sqlite
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'`)
    .get();
  const applied = hasTable
    ? (conn.sqlite.prepare('SELECT count(*) AS n FROM __drizzle_migrations').get() as { n: number })
        .n
    : 0;
  return Math.max(0, journal.entries.length - applied);
}

export function runMigrations(conn: DatabaseConnection): void {
  migrate(conn.db, { migrationsFolder: MIGRATIONS_DIR });
}
