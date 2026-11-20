import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import {
  CONSUMPTION_FORMATS,
  CONSUMPTION_STATUSES,
  GOAL_METRICS,
  GOAL_PERIODS,
  NOTE_KINDS,
  PROGRESS_SOURCES,
  UNITS,
  type FilterNode,
} from '@mylibrary/core';
import { createdAt, id, sqlList, updatedAt } from './common';
import { items } from './catalog';
import { itemFiles, type Locator } from './files';

/** One read-through / watch-through of an item. Re-reads are new rows. */
export const consumptions = sqliteTable(
  'consumptions',
  {
    id: id(),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    status: text('status', { enum: CONSUMPTION_STATUSES }).notNull().default('planned'),
    format: text('format', { enum: CONSUMPTION_FORMATS }),
    itemFileId: text('item_file_id').references(() => itemFiles.id, { onDelete: 'set null' }),
    startedOn: text('started_on'),
    finishedOn: text('finished_on'),
    droppedOn: text('dropped_on'),
    /** 0–5, fractional allowed */
    rating: real('rating'),
    review: text('review'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('consumptions_item_idx').on(t.itemId),
    index('consumptions_status_idx').on(t.status),
    index('consumptions_finished_idx').on(t.finishedOn),
    index('consumptions_started_idx').on(t.startedOn),
    check('consumptions_status', sql.raw(`status IN (${sqlList(CONSUMPTION_STATUSES)})`)),
    check(
      'consumptions_format',
      sql.raw(`format IS NULL OR format IN (${sqlList(CONSUMPTION_FORMATS)})`),
    ),
    check(
      'consumptions_rating',
      sql`${t.rating} IS NULL OR (${t.rating} >= 0 AND ${t.rating} <= 5)`,
    ),
    check(
      'consumptions_dates',
      sql`(${t.startedOn} IS NULL OR ${t.finishedOn} IS NULL OR ${t.startedOn} <= ${t.finishedOn})`,
    ),
  ],
);

/** Append-mostly log of progress; the source of truth for all history charts. */
export const progressEvents = sqliteTable(
  'progress_events',
  {
    id: id(),
    consumptionId: text('consumption_id')
      .notNull()
      .references(() => consumptions.id, { onDelete: 'cascade' }),
    /** denormalized for fast analytics joins */
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    occurredOn: text('occurred_on').notNull(),
    occurredAt: integer('occurred_at').notNull(),
    /** absolute position after this event (e.g. page 180) */
    position: real('position'),
    /** amount consumed in this event, in `unit` */
    delta: real('delta').notNull().default(0),
    unit: text('unit', { enum: UNITS }).notNull(),
    /** real time spent, when known */
    minutesSpent: real('minutes_spent'),
    source: text('source', { enum: PROGRESS_SOURCES }).notNull().default('manual'),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [
    index('progress_events_occurred_on_idx').on(t.occurredOn),
    index('progress_events_consumption_idx').on(t.consumptionId, t.occurredAt),
    index('progress_events_item_idx').on(t.itemId),
    check('progress_events_source', sql.raw(`source IN (${sqlList(PROGRESS_SOURCES)})`)),
    check('progress_events_unit', sql.raw(`unit IN (${sqlList(UNITS)})`)),
  ],
);

export const goals = sqliteTable(
  'goals',
  {
    id: id(),
    name: text('name').notNull(),
    period: text('period', { enum: GOAL_PERIODS }).notNull(),
    startOn: text('start_on').notNull(),
    endOn: text('end_on').notNull(),
    metric: text('metric', { enum: GOAL_METRICS }).notNull(),
    unit: text('unit', { enum: UNITS }),
    target: real('target').notNull(),
    filter: text('filter', { mode: 'json' }).$type<FilterNode | null>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('goals_range', sql`${t.startOn} <= ${t.endOn}`),
    check('goals_target', sql`${t.target} > 0`),
  ],
);

/** Viewer resume point per file. */
export const filePositions = sqliteTable(
  'file_positions',
  {
    id: id(),
    itemFileId: text('item_file_id')
      .notNull()
      .references(() => itemFiles.id, { onDelete: 'cascade' }),
    consumptionId: text('consumption_id').references(() => consumptions.id, {
      onDelete: 'set null',
    }),
    locator: text('locator', { mode: 'json' }).$type<Locator>().notNull(),
    percent: real('percent'),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('file_positions_file_uq').on(t.itemFileId)],
);

export const notes = sqliteTable(
  'notes',
  {
    id: id(),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    consumptionId: text('consumption_id').references(() => consumptions.id, {
      onDelete: 'set null',
    }),
    itemFileId: text('item_file_id').references(() => itemFiles.id, { onDelete: 'set null' }),
    kind: text('kind', { enum: NOTE_KINDS }).notNull().default('note'),
    body: text('body').notNull(),
    locator: text('locator', { mode: 'json' }).$type<Locator>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('notes_item_idx').on(t.itemId),
    check('notes_kind', sql.raw(`kind IN (${sqlList(NOTE_KINDS)})`)),
  ],
);
