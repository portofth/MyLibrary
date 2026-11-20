import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { FILE_ROLES } from '@mylibrary/core';
import { id, sqlList } from './common';
import { items } from './catalog';

export interface FileMetadata {
  pages?: number;
  durationSeconds?: number;
  chapters?: Array<{ title: string; start: number }>;
  /** article snapshots */
  sourceUrl?: string;
  capturedAt?: number;
  wordCount?: number;
  [key: string]: unknown;
}

export type Locator =
  | { type: 'epub-cfi'; cfi: string }
  | { type: 'pdf-page'; page: number }
  | { type: 'media-time'; seconds: number }
  | { type: 'image-page'; page: number }
  | { type: 'scroll'; fraction: number };

/** A stored file (content-addressed in files/). One item may own many files. */
export const itemFiles = sqliteTable(
  'item_files',
  {
    id: id(),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    role: text('role', { enum: FILE_ROLES }).notNull().default('main'),
    /** lowercase extension-like format: epub, pdf, m4b, html … */
    format: text('format').notNull(),
    mime: text('mime').notNull(),
    originalName: text('original_name').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    sha256: text('sha256').notNull(),
    /** relative to the data dir, e.g. files/ab/<sha256>.epub */
    storagePath: text('storage_path').notNull(),
    label: text('label'),
    metadata: text('metadata', { mode: 'json' }).$type<FileMetadata>().notNull().default({}),
    addedAt: integer('added_at')
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => [
    index('item_files_item_idx').on(t.itemId),
    index('item_files_sha256_idx').on(t.sha256),
    check('item_files_role', sql.raw(`role IN (${sqlList(FILE_ROLES)})`)),
    check('item_files_size', sql`${t.sizeBytes} >= 0`),
  ],
);
