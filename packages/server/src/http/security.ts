import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { getConnInfo } from '@hono/node-server/conninfo';

export const TOKEN_COOKIE = 'ml_token';

export type SecurityVariables = { clientIsLoopback: boolean };

export interface SecurityOptions {
  accessToken: string;
  allowedHosts: string[];
  trustProxy: boolean;
  /** injectable for tests; default reads the socket address */
  getRemoteAddress?: (c: Context) => string | undefined;
}

export function isLoopbackAddress(addr: string | undefined): boolean {
  if (!addr) return false;
  const a = addr.toLowerCase();
  return a === '::1' || a.startsWith('127.') || a.startsWith('::ffff:127.');
}

/** "host:port" / "[v6]:port" → hostname */
export function hostnameOf(hostHeader: string): string {
  const h = hostHeader.trim().toLowerCase();
  if (h.startsWith('[')) return h.slice(1, h.indexOf(']'));
  const colon = h.lastIndexOf(':');
  return colon > -1 && h.indexOf(':') === colon ? h.slice(0, colon) : h;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function defaultRemoteAddress(c: Context): string | undefined {
  try {
    return getConnInfo(c).remote.address;
  } catch {
    return undefined;
  }
}

/**
 * 1. Host allowlist (blocks DNS rebinding): IP literal, localhost, or configured hostnames.
 * 2. Cross-origin writes rejected (CSRF): Origin must match Host for non-safe methods.
 * 3. Non-loopback clients must present the access token (cookie, bearer, or ?token= once).
 */
export function security(
  opts: SecurityOptions,
): MiddlewareHandler<{ Variables: SecurityVariables }> {
  const allowed = new Set(['localhost', ...opts.allowedHosts.map((h) => h.toLowerCase())]);
  const getRemote = opts.getRemoteAddress ?? defaultRemoteAddress;

  return async (c, next) => {
    const host = c.req.header('host');
    if (!host) return c.text('Missing Host header', 400);
    const hostname = hostnameOf(host);
    if (!(allowed.has(hostname) || isIP(hostname) || hostname.endsWith('.localhost'))) {
      return c.text('Host not allowed', 403);
    }

    const method = c.req.method;
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      const origin = c.req.header('origin');
      if (origin) {
        let originHost: string;
        try {
          originHost = new URL(origin).host.toLowerCase();
        } catch {
          return c.text('Bad Origin', 403);
        }
        if (originHost !== host.toLowerCase()) return c.text('Cross-origin request rejected', 403);
      } else if (c.req.header('sec-fetch-site') === 'cross-site') {
        return c.text('Cross-site request rejected', 403);
      }
    }

    let remote = getRemote(c);
    if (opts.trustProxy) {
      const fwd = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
      if (fwd) remote = fwd;
    }
    const loopback = isLoopbackAddress(remote);
    c.set('clientIsLoopback', loopback);
    if (loopback) return next();

    const queryToken = c.req.query('token');
    if (queryToken !== undefined && method === 'GET') {
      if (!safeEqual(queryToken, opts.accessToken)) return c.text('Invalid access token', 401);
      setCookie(c, TOKEN_COOKIE, opts.accessToken, {
        httpOnly: true,
        sameSite: 'Lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
      const url = new URL(c.req.url);
      url.searchParams.delete('token');
      return c.redirect(url.pathname + url.search, 302);
    }

    const bearer = c.req.header('authorization')?.match(/^Bearer (.+)$/)?.[1];
    const token = bearer ?? getCookie(c, TOKEN_COOKIE);
    if (!token || !safeEqual(token, opts.accessToken)) {
      return c.text('Access token required. Open the LAN link printed by the server.', 401);
    }
    return next();
  };
}
