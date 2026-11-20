import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TOKEN_COOKIE, hostnameOf, isLoopbackAddress } from '../src/http/security';
import { createCallerFactory } from '../src/trpc';
import { appRouter } from '../src/routers';
import { TEST_REMOTE_HEADER, makeTestEnv, type TestEnv } from './helpers';

let env: TestEnv;
beforeEach(async () => {
  env = await makeTestEnv();
});
afterEach(() => env.cleanup());

const req = (path: string, init: RequestInit & { headers?: Record<string, string> } = {}) =>
  env.app.request(`http://localhost:4310${path}`, {
    ...init,
    headers: { host: 'localhost:4310', ...init.headers },
  });

describe('security middleware', () => {
  it('allows loopback clients without a token', async () => {
    const res = await req('/api/health');
    expect(res.status).toBe(200);
  });

  it('blocks unknown Host headers (DNS rebinding)', async () => {
    expect((await req('/api/health', { headers: { host: 'evil.example.com' } })).status).toBe(403);
    expect((await req('/api/health', { headers: { host: '192.168.1.20:4310' } })).status).toBe(200);
    expect((await req('/api/health', { headers: { host: '[::1]:4310' } })).status).toBe(200);
  });

  it('rejects cross-origin writes', async () => {
    const res = await req('/trpc/system.backups.create', {
      method: 'POST',
      headers: { origin: 'https://evil.example.com', 'content-type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(403);
    const same = await req('/trpc/system.backups.create', {
      method: 'POST',
      headers: { origin: 'http://localhost:4310', 'content-type': 'application/json' },
      body: '{}',
    });
    expect(same.status).toBe(200);
  });

  it('requires the access token for LAN clients and accepts it once via ?token=', async () => {
    const lan = { [TEST_REMOTE_HEADER]: '192.168.1.50', host: '192.168.1.10:4310' };
    expect((await req('/api/health', { headers: lan })).status).toBe(401);
    expect((await req('/api/health?token=wrong', { headers: lan })).status).toBe(401);

    const token = env.services.config.accessToken;
    const login = await req(`/library?token=${token}&x=1`, { headers: lan });
    expect(login.status).toBe(302);
    expect(login.headers.get('location')).toBe('/library?x=1');
    const cookie = login.headers.get('set-cookie')!;
    expect(cookie).toContain(`${TOKEN_COOKIE}=`);
    expect(cookie).toContain('HttpOnly');

    const ok = await req('/api/health', { headers: { ...lan, cookie: cookie.split(';')[0]! } });
    expect(ok.status).toBe(200);
    const bearer = await req('/api/health', {
      headers: { ...lan, authorization: `Bearer ${token}` },
    });
    expect(bearer.status).toBe(200);
  });

  it('ignores X-Forwarded-For unless trustProxy is on', async () => {
    const res = await req('/api/health', {
      headers: { [TEST_REMOTE_HEADER]: '192.168.1.50', 'x-forwarded-for': '127.0.0.1' },
    });
    expect(res.status).toBe(401);
  });

  it('parses hosts and loopback addresses', () => {
    expect(hostnameOf('LocalHost:4310')).toBe('localhost');
    expect(hostnameOf('[::1]:80')).toBe('::1');
    expect(hostnameOf('::1')).toBe('::1');
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('10.0.0.1')).toBe(false);
    expect(isLoopbackAddress(undefined)).toBe(false);
  });
});

describe('tRPC', () => {
  const caller = () =>
    createCallerFactory(appRouter)({
      services: env.services,
      db: env.services.db,
      clientIsLoopback: true,
    });

  it('reports status', async () => {
    const s = await caller().system.status();
    expect(s.counts.items).toBe(0);
    expect(s.dataDir).toBe(env.services.config.paths.root);
    expect(s.lastBackup).toBeNull();
  });

  it('lists media types and updates settings', async () => {
    const types = await caller().mediaTypes.list();
    expect(types[0]?.id).toBe('book');
    const s = await caller().settings.update({ theme: 'dark', weekStartsOn: 0 });
    expect(s).toMatchObject({ theme: 'dark', weekStartsOn: 0 });
    await expect(caller().settings.update({ weekStartsOn: 9 })).rejects.toThrow();
  });

  it('serves over HTTP', async () => {
    const res = await req('/trpc/system.health');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ result: { data: { ok: true } } });
  });
});
