/**
 * UUIDv7: time-ordered (sortable by creation), globally unique — safe for a future
 * sync/merge between devices. Works in Node >= 19 and every modern browser.
 */
const webCrypto = (
  globalThis as unknown as { crypto: { getRandomValues<T extends Uint8Array>(a: T): T } }
).crypto;

export function newId(now: number = Date.now()): string {
  const bytes = webCrypto.getRandomValues(new Uint8Array(16));
  // 48-bit big-endian millisecond timestamp
  let ts = now;
  for (let i = 5; i >= 0; i--) {
    bytes[i] = ts % 256;
    ts = Math.floor(ts / 256);
  }
  bytes[6] = 0x70 | (bytes[6]! & 0x0f); // version 7
  bytes[8] = 0x80 | (bytes[8]! & 0x3f); // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** Extract the creation time embedded in a UUIDv7. */
export function idTimestamp(id: string): number {
  return parseInt(id.slice(0, 8) + id.slice(9, 13), 16);
}
