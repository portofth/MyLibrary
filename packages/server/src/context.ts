import type { DatabaseConnection, DB } from '@mylibrary/db';
import type { AppConfig } from './config';
import type { BackupService } from './services/backup';
import type { FileStore } from './services/fileStore';

/** Long-lived services shared by every request. */
export interface AppServices {
  config: AppConfig;
  conn: DatabaseConnection;
  db: DB;
  files: FileStore;
  covers: FileStore;
  backups: BackupService;
  startedAt: number;
}

/** Per-request tRPC context. */
export interface RequestContext {
  services: AppServices;
  db: DB;
  clientIsLoopback: boolean;
}
