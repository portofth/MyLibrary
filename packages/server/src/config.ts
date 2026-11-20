import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';

export const DEFAULT_PORT = 4310;

/** Layout of the data directory (see CLAUDE.md → Data directory). */
export interface DataPaths {
  root: string;
  db: string;
  config: string;
  files: string;
  covers: string;
  backups: string;
  tmp: string;
}

export function dataPaths(root: string): DataPaths {
  const r = resolve(root);
  return {
    root: r,
    db: join(r, 'library.db'),
    config: join(r, 'config.json'),
    files: join(r, 'files'),
    covers: join(r, 'covers'),
    backups: join(r, 'backups'),
    tmp: join(r, 'tmp'),
  };
}

export function ensureDataDirs(paths: DataPaths): void {
  for (const dir of [paths.root, paths.files, paths.covers, paths.backups, paths.tmp]) {
    mkdirSync(dir, { recursive: true });
  }
}

/** Persisted in <data dir>/config.json — editable by hand. */
export const fileConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).default(DEFAULT_PORT),
  /** bind to all interfaces so phones on the LAN can connect (token-protected) */
  lan: z.boolean().default(false),
  /** explicit bind address; overrides `lan` */
  host: z.string().optional(),
  accessToken: z.string().min(24),
  /** extra hostnames accepted in the Host header (e.g. "mylibrary.home") */
  allowedHosts: z.array(z.string()).default([]),
  backup: z
    .object({
      keep: z.number().int().min(1).default(14),
      intervalHours: z.number().positive().default(24),
    })
    .default({ keep: 14, intervalHours: 24 }),
});
export type FileConfig = z.infer<typeof fileConfigSchema>;

export interface AppConfig extends FileConfig {
  paths: DataPaths;
  host: string;
  dev: boolean;
  /** trust X-Forwarded-For (only for the Vite dev proxy) */
  trustProxy: boolean;
}

export function generateToken(): string {
  return randomBytes(24).toString('base64url');
}

/** Read config.json, creating it (with a fresh access token) on first run. */
export function loadFileConfig(paths: DataPaths): FileConfig {
  let raw: unknown = {};
  if (existsSync(paths.config)) {
    raw = JSON.parse(readFileSync(paths.config, 'utf8'));
  }
  const withToken = { accessToken: generateToken(), ...(raw as object) };
  const parsed = fileConfigSchema.parse(withToken);
  if (!existsSync(paths.config) || !(raw as { accessToken?: string }).accessToken) {
    writeFileSync(paths.config, JSON.stringify(parsed, null, 2) + '\n', { mode: 0o600 });
  }
  return parsed;
}

export function resolveConfig(
  argv: string[] = process.argv.slice(2),
  env = process.env,
): AppConfig {
  const { values } = parseArgs({
    // package-manager passthrough may leave a bare "--" in argv
    args: argv.filter((a) => a !== '--'),
    options: {
      'data-dir': { type: 'string' },
      port: { type: 'string' },
      host: { type: 'string' },
      lan: { type: 'boolean' },
      dev: { type: 'boolean' },
    },
    allowPositionals: false,
    strict: true,
  });

  const root = values['data-dir'] ?? env.MYLIBRARY_DATA_DIR ?? join(homedir(), 'MyLibrary');
  const paths = dataPaths(root);
  ensureDataDirs(paths);
  const file = loadFileConfig(paths);

  const port = Number(values.port ?? env.MYLIBRARY_PORT ?? file.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid port: ${port}`);
  const lan = values.lan ?? (env.MYLIBRARY_LAN ? env.MYLIBRARY_LAN === '1' : file.lan);
  const host = values.host ?? env.MYLIBRARY_HOST ?? file.host ?? (lan ? '0.0.0.0' : '127.0.0.1');
  const dev = values.dev ?? false;

  return {
    ...file,
    port,
    lan,
    host,
    paths,
    dev,
    trustProxy: dev || env.MYLIBRARY_TRUST_PROXY === '1',
  };
}
