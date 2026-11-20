import { openDatabase, pendingMigrationCount, runMigrations, seed } from '@mylibrary/db';
import { existsSync } from 'node:fs';
import type { AppConfig } from './config';
import type { AppServices } from './context';
import { BackupService } from './services/backup';
import { FileStore, cleanTmp } from './services/fileStore';

export interface BootstrapLog {
  info(msg: string): void;
}

/**
 * Open the library: back up before pending migrations, migrate, seed, clean tmp/.
 * Shared by the server entry point and tests.
 */
export async function bootstrap(
  config: AppConfig,
  log: BootstrapLog = console,
): Promise<AppServices> {
  const { paths } = config;
  const isNew = !existsSync(paths.db);
  const conn = openDatabase(paths.db);
  const backups = new BackupService(conn.sqlite, paths.backups, config.backup.keep);

  const pending = pendingMigrationCount(conn);
  if (!isNew && pending > 0) {
    const b = await backups.create('pre-migration');
    log.info(`Backed up before ${pending} migration(s): ${b.name}`);
  }
  runMigrations(conn);
  seed(conn.db);

  const removed = await cleanTmp(paths.tmp);
  if (removed > 0) log.info(`Removed ${removed} interrupted upload(s) from tmp/`);

  return {
    config,
    conn,
    db: conn.db,
    files: new FileStore(paths.root, 'files', paths.tmp),
    covers: new FileStore(paths.root, 'covers', paths.tmp),
    backups,
    startedAt: Date.now(),
  };
}
