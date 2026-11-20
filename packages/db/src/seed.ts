import { sql } from 'drizzle-orm';
import { BUILTIN_MEDIA_TYPES, BUILTIN_TAG_GROUPS } from '@mylibrary/core';
import type { DB } from './client';
import { mediaTypes, tagGroups } from './schema';

/** Idempotent: inserts built-in records that are missing; never overwrites user edits. */
export function seed(db: DB): void {
  db.transaction((tx) => {
    BUILTIN_MEDIA_TYPES.forEach((mt, i) => {
      tx.insert(mediaTypes)
        .values({ ...mt, builtin: true, sortOrder: i })
        .onConflictDoNothing()
        .run();
    });
    BUILTIN_TAG_GROUPS.forEach((g, i) => {
      const exists = tx
        .select({ id: tagGroups.id })
        .from(tagGroups)
        .where(sql`${tagGroups.name} = ${g.name} COLLATE NOCASE`)
        .get();
      if (!exists) tx.insert(tagGroups).values({ name: g.name, sortOrder: i }).run();
    });
  });
}
