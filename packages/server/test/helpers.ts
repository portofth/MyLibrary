import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app';
import { bootstrap } from '../src/bootstrap';
import { dataPaths, ensureDataDirs, generateToken, type AppConfig } from '../src/config';
import type { AppServices } from '../src/context';

export const TEST_REMOTE_HEADER = 'x-test-remote-address';

export interface TestEnv {
  services: AppServices;
  app: ReturnType<typeof createApp>;
  cleanup(): void;
}

/** Fresh library in a temp data dir. `x-test-remote-address` header simulates the client IP. */
export async function makeTestEnv(overrides: Partial<AppConfig> = {}): Promise<TestEnv> {
  const root = mkdtempSync(join(tmpdir(), 'mylibrary-test-'));
  const paths = dataPaths(root);
  ensureDataDirs(paths);
  const config: AppConfig = {
    port: 0,
    lan: false,
    host: '127.0.0.1',
    accessToken: generateToken(),
    allowedHosts: [],
    backup: { keep: 3, intervalHours: 24 },
    paths,
    dev: false,
    trustProxy: false,
    ...overrides,
  };
  const services = await bootstrap(config, { info: () => {} });
  const app = createApp(services, {
    getRemoteAddress: (c) => c.req.header(TEST_REMOTE_HEADER) ?? '127.0.0.1',
  });
  return {
    services,
    app,
    cleanup() {
      services.conn.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}
