import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { VIEW_MODES, type FilterNode } from '@mylibrary/core';
import { createdAt, id, updatedAt } from './common';
import { mediaTypes } from './catalog';

export const savedViews = sqliteTable('saved_views', {
  id: id(),
  name: text('name').notNull(),
  mediaTypeId: text('media_type_id').references(() => mediaTypes.id, { onDelete: 'cascade' }),
  filter: text('filter', { mode: 'json' }).$type<FilterNode | null>(),
  viewMode: text('view_mode', { enum: VIEW_MODES }).notNull().default('grid'),
  columns: text('columns', { mode: 'json' }).$type<Array<{ key: string; width?: number }>>(),
  sort: text('sort', { mode: 'json' }).$type<Array<{ key: string; dir: 'asc' | 'desc' }>>(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const dashboards = sqliteTable('dashboards', {
  id: id(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const widgets = sqliteTable(
  'widgets',
  {
    id: id(),
    dashboardId: text('dashboard_id')
      .notNull()
      .references(() => dashboards.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    /** analytics query spec + chart options; validated by the widget registry */
    config: text('config', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
    layout: text('layout', { mode: 'json' })
      .$type<{ x: number; y: number; w: number; h: number }>()
      .notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('widgets_dashboard_idx').on(t.dashboardId)],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
  updatedAt: updatedAt(),
});
