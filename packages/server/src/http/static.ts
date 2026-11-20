import { existsSync } from 'node:fs';
import { relative } from 'node:path';
import type { Env, Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';

/** Serve the built web app with SPA fallback (production only). */
export function mountWebApp<E extends Env>(app: Hono<E>, distDir: string): boolean {
  if (!existsSync(distDir)) return false;
  // serveStatic resolves `root` relative to the process cwd
  const root = relative(process.cwd(), distDir) || '.';
  app.use(
    '/assets/*',
    serveStatic({
      root,
      onFound: (_p, c) => c.header('Cache-Control', 'public, max-age=31536000, immutable'),
    }),
  );
  app.use('/*', serveStatic({ root }));
  app.get('*', serveStatic({ root, path: 'index.html' }));
  return true;
}
