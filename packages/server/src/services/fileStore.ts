import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, readdir, rename, rm, stat, unlink } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export interface StoredFile {
  sha256: string;
  sizeBytes: number;
  /** relative to the data dir, e.g. "files/ab/<sha256>.epub" — what the DB stores */
  storagePath: string;
  /** true when an identical file was already stored */
  deduplicated: boolean;
}

export class FileTooLargeError extends Error {
  constructor(limit: number) {
    super(`File exceeds the ${limit} byte limit`);
  }
}

const EXT_RE = /^[a-z0-9]{1,10}$/;

export function sanitizeExtension(ext: string | undefined | null): string {
  const e = (ext ?? '').replace(/^\./, '').toLowerCase();
  return EXT_RE.test(e) ? e : 'bin';
}

/**
 * Content-addressed, deduplicating store for one area of the data dir ("files" or "covers").
 * Files are written to tmp/ while hashed, then atomically renamed to <area>/<h[0:2]>/<hash>.<ext>.
 * Stored files are immutable. Deleting is the caller's decision (only when unreferenced).
 */
export class FileStore {
  readonly areaDir: string;

  constructor(
    private readonly dataRoot: string,
    readonly area: 'files' | 'covers',
    private readonly tmpDir: string,
  ) {
    this.areaDir = join(dataRoot, area);
  }

  async putStream(
    source: Readable | AsyncIterable<Uint8Array>,
    ext: string,
    opts: { maxBytes?: number } = {},
  ): Promise<StoredFile> {
    const extension = sanitizeExtension(ext);
    await mkdir(this.tmpDir, { recursive: true });
    const tmpPath = join(this.tmpDir, `${randomUUID()}.part`);
    const hash = createHash('sha256');
    let size = 0;
    const meter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        size += chunk.length;
        if (opts.maxBytes !== undefined && size > opts.maxBytes) {
          cb(new FileTooLargeError(opts.maxBytes));
          return;
        }
        hash.update(chunk);
        cb(null, chunk);
      },
    });

    try {
      const input = source instanceof Readable ? source : Readable.from(source);
      await pipeline(input, meter, createWriteStream(tmpPath, { flags: 'wx' }));
    } catch (err) {
      await rm(tmpPath, { force: true });
      throw err;
    }

    const sha256 = hash.digest('hex');
    const storagePath = [this.area, sha256.slice(0, 2), `${sha256}.${extension}`].join('/');
    const target = join(this.dataRoot, storagePath);
    if (existsSync(target)) {
      await unlink(tmpPath);
      return { sha256, sizeBytes: size, storagePath, deduplicated: true };
    }
    await mkdir(dirname(target), { recursive: true });
    await rename(tmpPath, target);
    return { sha256, sizeBytes: size, storagePath, deduplicated: false };
  }

  putBuffer(data: Uint8Array, ext: string): Promise<StoredFile> {
    return this.putStream(Readable.from([Buffer.from(data)]), ext);
  }

  /** Copy a file from the local filesystem (e.g. "import folder"). */
  putFile(path: string, ext: string, opts?: { maxBytes?: number }): Promise<StoredFile> {
    return this.putStream(createReadStream(path), ext, opts);
  }

  /** Absolute path for a stored relative path. Throws if it escapes this area. */
  resolve(storagePath: string): string {
    const abs = resolve(this.dataRoot, storagePath);
    const rel = relative(this.areaDir, abs);
    if (
      !rel ||
      rel.startsWith('..') ||
      rel.includes(`..${sep}`) ||
      resolve(this.areaDir, rel) !== abs
    ) {
      throw new Error(`Path escapes the ${this.area} store: ${storagePath}`);
    }
    return abs;
  }

  exists(storagePath: string): boolean {
    return existsSync(this.resolve(storagePath));
  }

  async size(storagePath: string): Promise<number> {
    return (await stat(this.resolve(storagePath))).size;
  }

  /** Physically delete. Callers must first verify no DB row references this path. */
  async remove(storagePath: string): Promise<void> {
    await rm(this.resolve(storagePath), { force: true });
  }

  /** Total bytes and file count in this area (for the status page). */
  async usage(): Promise<{ files: number; bytes: number }> {
    let files = 0;
    let bytes = 0;
    if (!existsSync(this.areaDir)) return { files, bytes };
    for (const entry of await readdir(this.areaDir, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      files++;
      bytes += (await stat(join(entry.parentPath, entry.name))).size;
    }
    return { files, bytes };
  }
}

/** Remove leftovers of interrupted uploads. Called at startup. */
export async function cleanTmp(tmpDir: string): Promise<number> {
  if (!existsSync(tmpDir)) return 0;
  const entries = await readdir(tmpDir);
  await Promise.all(entries.map((e) => rm(join(tmpDir, e), { recursive: true, force: true })));
  return entries.length;
}
