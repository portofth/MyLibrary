import { existsSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { makeTestEnv, type TestEnv } from './helpers';

let env: TestEnv;
beforeEach(async () => {
  env = await makeTestEnv();
});
afterEach(() => env.cleanup());

describe('BackupService', () => {
  it('creates readable snapshots of the live database', async () => {
    const { backups } = env.services;
    expect(backups.isDue(1000)).toBe(true);
    const b = await backups.create('manual');
    expect(b.name).toMatch(/^library-\d{8}-\d{6}-manual\.db$/);
    expect(existsSync(b.path)).toBe(true);
    const copy = new Database(b.path, { readonly: true });
    const row = copy.prepare(`SELECT count(*) AS n FROM media_types`).get() as { n: number };
    copy.close();
    expect(row.n).toBeGreaterThan(0);
    expect(backups.isDue(60_000)).toBe(false);
  });

  it('rotates to keep only the newest N', async () => {
    const { backups } = env.services; // keep = 3
    for (let i = 0; i < 5; i++) await backups.create('manual');
    expect(backups.list()).toHaveLength(3);
  });

  it('shares an in-flight backup between concurrent calls', async () => {
    const [a, b] = await Promise.all([
      env.services.backups.create(),
      env.services.backups.create(),
    ]);
    expect(a.name).toBe(b.name);
  });
});
