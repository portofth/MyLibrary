import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { SqliteHandle } from '@mylibrary/db';

export interface BackupInfo {
  name: string;
  path: string;
  createdAt: number;
  sizeBytes: number;
}

const NAME_RE = /^library-(\d{8})-(\d{6})(?:-\d+)?(?:-([a-z-]+))?\.db$/;

function stamp(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * Consistent DB snapshots via SQLite's online backup API (safe while the app runs).
 * Media files need no snapshot: they are immutable and content-addressed.
 */
export class BackupService {
  private running: Promise<BackupInfo> | null = null;

  constructor(
    private readonly sqlite: SqliteHandle,
    readonly dir: string,
    private readonly keep: number,
  ) {
    mkdirSync(dir, { recursive: true });
  }

  list(): BackupInfo[] {
    return readdirSync(this.dir)
      .filter((name) => NAME_RE.test(name))
      .map((name) => {
        const path = join(this.dir, name);
        const st = statSync(path);
        return { name, path, createdAt: Math.round(st.mtimeMs), sizeBytes: st.size };
      })
      .sort((a, b) => b.createdAt - a.createdAt || b.name.localeCompare(a.name));
  }

  latest(): BackupInfo | undefined {
    return this.list()[0];
  }

  isDue(maxAgeMs: number, now = Date.now()): boolean {
    const latest = this.latest();
    return !latest || now - latest.createdAt >= maxAgeMs;
  }

  /** Create a snapshot; concurrent calls share the in-flight backup. */
  create(
    reason: 'manual' | 'scheduled' | 'startup' | 'pre-migration' = 'manual',
  ): Promise<BackupInfo> {
    this.running ??= this.doCreate(reason).finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async doCreate(reason: string): Promise<BackupInfo> {
    const base = `library-${stamp(new Date())}`;
    let name = `${base}-${reason}.db`;
    for (let i = 1; this.exists(name); i++) name = `${base}-${i}-${reason}.db`;
    const path = join(this.dir, name);
    await this.sqlite.backup(path);
    this.rotate();
    const st = statSync(path);
    return { name, path, createdAt: Math.round(st.mtimeMs), sizeBytes: st.size };
  }

  private exists(name: string): boolean {
    try {
      statSync(join(this.dir, name));
      return true;
    } catch {
      return false;
    }
  }

  /** Keep only the newest `keep` snapshots. */
  rotate(): void {
    for (const old of this.list().slice(this.keep)) rmSync(old.path, { force: true });
  }
}
