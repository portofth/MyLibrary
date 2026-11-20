import { integer, text } from 'drizzle-orm/sqlite-core';
import { newId } from '@mylibrary/core';

/** uuidv7 text primary key */
export const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => newId());

/** epoch-ms instants */
export const createdAt = () =>
  integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now());
export const updatedAt = () =>
  integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now());

/** Build a SQL `IN (...)` list from a const enum array, for CHECK constraints. */
export const sqlList = (values: readonly string[]) =>
  values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');
