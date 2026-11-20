import { networkInterfaces } from 'node:os';
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { bootstrap } from './bootstrap';
import { resolveConfig } from './config';
import { APP_VERSION } from './version';

const config = resolveConfig();
const services = await bootstrap(config);
const app = createApp(services, { serveWeb: !config.dev });

// Scheduled DB snapshots
const intervalMs = config.backup.intervalHours * 3_600_000;
async function backupIfDue(reason: 'startup' | 'scheduled') {
  try {
    if (services.backups.isDue(intervalMs)) {
      const b = await services.backups.create(reason);
      console.info(`Backup created: ${b.name}`);
    }
  } catch (err) {
    console.error('Backup failed:', err);
  }
}
await backupIfDue('startup');
const backupTimer = setInterval(
  () => void backupIfDue('scheduled'),
  Math.min(intervalMs, 3_600_000),
);
backupTimer.unref();

const server = serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
  const lines = [
    `MyLibrary ${APP_VERSION}${config.dev ? ' (dev API)' : ''}`,
    `  Data:  ${config.paths.root}`,
  ];
  lines.push(`  Local: http://localhost:${info.port}`);
  if (config.host !== '127.0.0.1' && config.host !== 'localhost' && config.host !== '::1') {
    for (const addrs of Object.values(networkInterfaces())) {
      for (const a of addrs ?? []) {
        if (a.family === 'IPv4' && !a.internal) {
          lines.push(`  LAN:   http://${a.address}:${info.port}/?token=${config.accessToken}`);
        }
      }
    }
  }
  console.info(lines.join('\n'));
});

let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`\n${signal} received, closing…`);
  clearInterval(backupTimer);
  server.close(() => {
    services.conn.close();
    process.exit(0);
  });
  setTimeout(() => {
    services.conn.close();
    process.exit(0);
  }, 3000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
