import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  getSettings,
  openDatabase,
  pendingMigrationCount,
  runMigrations,
  schema,
  seed,
  setSetting,
  type DatabaseConnection,
} from '../src';

let conn: DatabaseConnection;

beforeEach(() => {
  conn = openDatabase(':memory:');
  runMigrations(conn);
  seed(conn.db);
});
afterEach(() => conn.close());

describe('migrations + seed', () => {
  it('applies all migrations', () => {
    expect(pendingMigrationCount(conn)).toBe(0);
  });

  it('seeds built-ins idempotently', () => {
    seed(conn.db);
    const types = conn.db.select().from(schema.mediaTypes).all();
    expect(types.map((t) => t.id)).toContain('book');
    expect(new Set(types.map((t) => t.id)).size).toBe(types.length);
    expect(
      conn.db
        .select()
        .from(schema.tagGroups)
        .all()
        .map((g) => g.name),
    ).toEqual(['Genre', 'Topic']);
  });
});

describe('schema integrity', () => {
  function makeItem() {
    return conn.db
      .insert(schema.items)
      .values({ mediaTypeId: 'book', title: 'Dune', totalUnits: 412 })
      .returning()
      .get();
  }

  it('creates items with uuidv7 ids and JSON defaults', () => {
    const item = makeItem();
    expect(item.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(item.fields).toEqual({});
    expect(item.lockedFields).toEqual([]);
  });

  it('enforces foreign keys and check constraints', () => {
    expect(() =>
      conn.db.insert(schema.items).values({ mediaTypeId: 'nope', title: 'x' }).run(),
    ).toThrow(/FOREIGN KEY/);
    const item = makeItem();
    expect(() =>
      conn.db.insert(schema.consumptions).values({ itemId: item.id, rating: 7 }).run(),
    ).toThrow(/CHECK/);
    expect(() =>
      conn.db
        .insert(schema.consumptions)
        .values({ itemId: item.id, startedOn: '2026-02-01', finishedOn: '2026-01-01' })
        .run(),
    ).toThrow(/CHECK/);
  });

  it('cascades item deletion to consumptions, events and files', () => {
    const item = makeItem();
    const c = conn.db
      .insert(schema.consumptions)
      .values({ itemId: item.id, status: 'in_progress', startedOn: '2026-11-01' })
      .returning()
      .get();
    conn.db
      .insert(schema.progressEvents)
      .values({
        consumptionId: c.id,
        itemId: item.id,
        occurredOn: '2026-11-02',
        occurredAt: Date.now(),
        position: 50,
        delta: 50,
        unit: 'page',
      })
      .run();
    conn.db
      .insert(schema.itemFiles)
      .values({
        itemId: item.id,
        format: 'epub',
        mime: 'application/epub+zip',
        originalName: 'dune.epub',
        sizeBytes: 10,
        sha256: 'a'.repeat(64),
        storagePath: `files/aa/${'a'.repeat(64)}.epub`,
      })
      .run();
    conn.db.delete(schema.items).where(eq(schema.items.id, item.id)).run();
    expect(conn.db.select().from(schema.consumptions).all()).toHaveLength(0);
    expect(conn.db.select().from(schema.progressEvents).all()).toHaveLength(0);
    expect(conn.db.select().from(schema.itemFiles).all()).toHaveLength(0);
  });

  it('requires slug ids for media types and field keys', () => {
    const mt = { name: 'X', namePlural: 'Xs', primaryUnit: 'page' as const };
    expect(() =>
      conn.db
        .insert(schema.mediaTypes)
        .values({ ...mt, id: 'board-game' })
        .run(),
    ).toThrow(/CHECK/);
    expect(() =>
      conn.db
        .insert(schema.mediaTypes)
        .values({ ...mt, id: 'aBc' })
        .run(),
    ).toThrow(/CHECK/);
    conn.db
      .insert(schema.mediaTypes)
      .values({ ...mt, id: 'board_game' })
      .run();
    expect(() =>
      conn.db
        .insert(schema.fieldDefinitions)
        .values({ key: 'my key', label: 'x', kind: 'text' })
        .run(),
    ).toThrow(/CHECK/);
  });

  it('rejects duplicate custom field keys per media type, including global ones', () => {
    conn.db
      .insert(schema.fieldDefinitions)
      .values({ key: 'edition', label: 'Edition', kind: 'text' })
      .run();
    expect(() =>
      conn.db
        .insert(schema.fieldDefinitions)
        .values({ key: 'edition', label: 'Again', kind: 'text' })
        .run(),
    ).toThrow(/UNIQUE/);
    conn.db
      .insert(schema.fieldDefinitions)
      .values({ mediaTypeId: 'book', key: 'edition', label: 'Edition', kind: 'text' })
      .run();
  });
});

describe('settings', () => {
  it('returns defaults and persists validated values', () => {
    expect(getSettings(conn.db).weekStartsOn).toBe(1);
    setSetting(conn.db, 'weekStartsOn', 0);
    setSetting(conn.db, 'theme', 'dark');
    expect(getSettings(conn.db)).toMatchObject({ weekStartsOn: 0, theme: 'dark' });
    expect(() => setSetting(conn.db, 'weekStartsOn', 9)).toThrow();
  });
});
