import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { trpcServer } from '@hono/trpc-server';
import type { AppServices } from './context';
import { security, type SecurityOptions, type SecurityVariables } from './http/security';
import { mountWebApp } from './http/static';
import { appRouter } from './routers';

export const WEB_DIST_DIR = fileURLToPath(new URL('../../web/dist', import.meta.url));

export interface CreateAppOptions {
  /** serve the built web app (production) */
  serveWeb?: boolean;
  getRemoteAddress?: SecurityOptions['getRemoteAddress'];
}

export function createApp(services: AppServices, opts: CreateAppOptions = {}) {
  const app = new Hono<{ Variables: SecurityVariables }>();
  const { config } = services;

  app.use(
    '*',
    secureHeaders({
      crossOriginResourcePolicy: 'same-origin',
      referrerPolicy: 'no-referrer',
    }),
  );
  app.use(
    '*',
    security({
      accessToken: config.accessToken,
      allowedHosts: config.allowedHosts,
      trustProxy: config.trustProxy,
      ...(opts.getRemoteAddress ? { getRemoteAddress: opts.getRemoteAddress } : {}),
    }),
  );

  app.get('/api/health', (c) => c.json({ ok: true }));

  app.use(
    '/trpc/*',
    trpcServer({
      router: appRouter,
      endpoint: '/trpc',
      createContext: (_opts, c) => ({
        services,
        db: services.db,
        clientIsLoopback: c.get('clientIsLoopback') === true,
      }),
    }),
  );

  if (opts.serveWeb) {
    if (!mountWebApp(app, WEB_DIST_DIR)) {
      app.get('/', (c) => c.text('Web app not built. Run `pnpm build` first.', 503));
    }
  }

  return app;
}
