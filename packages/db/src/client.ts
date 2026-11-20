import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export type Schema = typeof schema;
export type DB = BetterSQLite3Database<Schema>;
export type SqliteHandle = Database.Database;

export interface DatabaseConnection {
  db: DB;
  sqlite: SqliteHandle;
  close(): void;
}

/** Open (or create) a library database with the pragmas MyLibrary relies on. */
export function openDatabase(file: string): DatabaseConnection {
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  const db = drizzle(sqlite, { schema });
  return {
    db,
    sqlite,
    close() {
      if (sqlite.open) {
        sqlite.pragma('optimize');
        sqlite.close();
      }
    },
  };
}
