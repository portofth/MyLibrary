import { mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  FileStore,
  FileTooLargeError,
  cleanTmp,
  sanitizeExtension,
} from '../src/services/fileStore';

let root: string;
let store: FileStore;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'mylibrary-fs-'));
  store = new FileStore(root, 'files', join(root, 'tmp'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('FileStore', () => {
  it('stores content-addressed and deduplicates identical content', async () => {
    const a = await store.putBuffer(Buffer.from('hello world'), 'EPUB');
    expect(a.sha256).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    expect(a.storagePath).toBe(`files/b9/${a.sha256}.epub`);
    expect(a.sizeBytes).toBe(11);
    expect(a.deduplicated).toBe(false);
    expect(readFileSync(store.resolve(a.storagePath), 'utf8')).toBe('hello world');

    const b = await store.putStream(
      Readable.from([Buffer.from('hello '), Buffer.from('world')]),
      'epub',
    );
    expect(b.deduplicated).toBe(true);
    expect(b.storagePath).toBe(a.storagePath);
    expect(readdirSync(join(root, 'tmp'))).toEqual([]);
  });

  it('imports from a local path', async () => {
    const src = join(root, 'book.pdf');
    writeFileSync(src, 'pdf-bytes');
    const r = await store.putFile(src, 'pdf');
    expect(store.exists(r.storagePath)).toBe(true);
    expect(await store.size(r.storagePath)).toBe(9);
    expect(await store.usage()).toEqual({ files: 1, bytes: 9 });
  });

  it('enforces size limits and leaves no partial files', async () => {
    await expect(
      store.putStream(Readable.from([Buffer.alloc(10), Buffer.alloc(10)]), 'bin', { maxBytes: 15 }),
    ).rejects.toBeInstanceOf(FileTooLargeError);
    expect(readdirSync(join(root, 'tmp'))).toEqual([]);
  });

  it('refuses paths outside its area', () => {
    expect(() => store.resolve('../etc/passwd')).toThrow();
    expect(() => store.resolve('files/../../x')).toThrow();
    expect(() => store.resolve('covers/aa/x.jpg')).toThrow();
    expect(() => store.resolve('files')).toThrow();
    expect(() => store.resolve('/etc/passwd')).toThrow();
    expect(store.resolve('files/aa/x.pdf')).toBe(join(root, 'files/aa/x.pdf'));
  });

  it('removes files', async () => {
    const r = await store.putBuffer(Buffer.from('x'), 'txt');
    await store.remove(r.storagePath);
    expect(store.exists(r.storagePath)).toBe(false);
  });
});

describe('sanitizeExtension', () => {
  it('normalizes or falls back to bin', () => {
    expect(sanitizeExtension('.M4B')).toBe('m4b');
    expect(sanitizeExtension('../x')).toBe('bin');
    expect(sanitizeExtension('')).toBe('bin');
    expect(sanitizeExtension(undefined)).toBe('bin');
  });
});

describe('cleanTmp', () => {
  it('wipes leftovers', async () => {
    const tmp = join(root, 'tmp');
    await store.putBuffer(Buffer.from('x'), 'txt');
    writeFileSync(join(tmp, 'stale.part'), 'x');
    expect(await cleanTmp(tmp)).toBe(1);
    expect(readdirSync(tmp)).toEqual([]);
  });
});
