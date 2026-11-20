import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import {
  COLLECTION_KINDS,
  FIELD_KINDS,
  IDENTIFIER_SCHEMES,
  PERSON_ROLES,
  UNITS,
  type Unit,
} from '@mylibrary/core';
import { createdAt, id, sqlList, updatedAt } from './common';

export const mediaTypes = sqliteTable(
  'media_types',
  {
    id: text('id').primaryKey(), // slug, e.g. "book"
    name: text('name').notNull(),
    namePlural: text('name_plural').notNull(),
    icon: text('icon').notNull().default('file'),
    primaryUnit: text('primary_unit', { enum: UNITS }).notNull(),
    builtin: integer('builtin', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    archivedAt: integer('archived_at'),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      'media_types_id_slug',
      sql`${t.id} NOT GLOB '*[^a-z0-9_]*' AND length(${t.id}) BETWEEN 1 AND 64`,
    ),
    check('media_types_unit', sql.raw(`primary_unit IN (${sqlList(UNITS)})`)),
  ],
);

export const fieldDefinitions = sqliteTable(
  'field_definitions',
  {
    id: id(),
    /** null = applies to every media type */
    mediaTypeId: text('media_type_id').references(() => mediaTypes.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    label: text('label').notNull(),
    kind: text('kind', { enum: FIELD_KINDS }).notNull(),
    options: text('options', { mode: 'json' }).$type<{
      choices?: string[];
      min?: number;
      max?: number;
    }>(),
    required: integer('required', { mode: 'boolean' }).notNull().default(false),
    filterable: integer('filterable', { mode: 'boolean' }).notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('field_definitions_type_key_uq')
      .on(t.mediaTypeId, t.key)
      .where(sql`${t.mediaTypeId} IS NOT NULL`),
    uniqueIndex('field_definitions_global_key_uq')
      .on(t.key)
      .where(sql`${t.mediaTypeId} IS NULL`),
    check(
      'field_definitions_key_slug',
      sql`${t.key} NOT GLOB '*[^a-z0-9_]*' AND length(${t.key}) BETWEEN 1 AND 64`,
    ),
    check('field_definitions_kind', sql.raw(`kind IN (${sqlList(FIELD_KINDS)})`)),
  ],
);

export const items = sqliteTable(
  'items',
  {
    id: id(),
    mediaTypeId: text('media_type_id')
      .notNull()
      .references(() => mediaTypes.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    subtitle: text('subtitle'),
    sortTitle: text('sort_title'),
    description: text('description'),
    coverPath: text('cover_path'),
    totalUnits: real('total_units'),
    /** overrides the media type's primary unit */
    unit: text('unit', { enum: UNITS }).$type<Unit>(),
    /** overrides the settings conversion rate for this item */
    minutesPerUnit: real('minutes_per_unit'),
    language: text('language'),
    publisher: text('publisher'),
    /** partial date: YYYY | YYYY-MM | YYYY-MM-DD */
    publishedOn: text('published_on'),
    sourceUrl: text('source_url'),
    fields: text('fields', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
    lockedFields: text('locked_fields', { mode: 'json' }).$type<string[]>().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('items_media_type_idx').on(t.mediaTypeId),
    // services always fill sort_title (title minus leading articles)
    index('items_sort_title_idx').on(sql`${t.sortTitle} COLLATE NOCASE`),
    index('items_created_at_idx').on(t.createdAt),
    check('items_total_units', sql`${t.totalUnits} IS NULL OR ${t.totalUnits} >= 0`),
    check('items_fields_json', sql`json_valid(${t.fields}) AND json_type(${t.fields}) = 'object'`),
  ],
);

export const itemIdentifiers = sqliteTable(
  'item_identifiers',
  {
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    scheme: text('scheme', { enum: IDENTIFIER_SCHEMES }).notNull(),
    value: text('value').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.itemId, t.scheme, t.value] }),
    index('item_identifiers_lookup_idx').on(t.scheme, t.value),
  ],
);

export const people = sqliteTable(
  'people',
  {
    id: id(),
    name: text('name').notNull(),
    sortName: text('sort_name'),
    bio: text('bio'),
    imagePath: text('image_path'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('people_name_idx').on(sql`${t.name} COLLATE NOCASE`)],
);

export const itemPeople = sqliteTable(
  'item_people',
  {
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    personId: text('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    role: text('role', { enum: PERSON_ROLES }).notNull(),
    position: integer('position').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.itemId, t.personId, t.role] }),
    index('item_people_person_idx').on(t.personId, t.role),
    check('item_people_role', sql.raw(`role IN (${sqlList(PERSON_ROLES)})`)),
  ],
);

export const tagGroups = sqliteTable(
  'tag_groups',
  {
    id: id(),
    name: text('name').notNull(),
    color: text('color'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('tag_groups_name_uq').on(sql`${t.name} COLLATE NOCASE`)],
);

export const tags = sqliteTable(
  'tags',
  {
    id: id(),
    groupId: text('group_id').references(() => tagGroups.id, { onDelete: 'set null' }),
    parentId: text('parent_id').references((): AnySQLiteColumn => tags.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    color: text('color'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('tags_group_name_uq')
      .on(t.groupId, sql`${t.name} COLLATE NOCASE`)
      .where(sql`${t.groupId} IS NOT NULL`),
    uniqueIndex('tags_ungrouped_name_uq')
      .on(sql`${t.name} COLLATE NOCASE`)
      .where(sql`${t.groupId} IS NULL`),
    index('tags_parent_idx').on(t.parentId),
  ],
);

export const itemTags = sqliteTable(
  'item_tags',
  {
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.tagId] }), index('item_tags_tag_idx').on(t.tagId)],
);

export const collections = sqliteTable(
  'collections',
  {
    id: id(),
    name: text('name').notNull(),
    kind: text('kind', { enum: COLLECTION_KINDS }).notNull().default('series'),
    description: text('description'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  () => [check('collections_kind', sql.raw(`kind IN (${sqlList(COLLECTION_KINDS)})`))],
);

export const collectionItems = sqliteTable(
  'collection_items',
  {
    collectionId: text('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    /** real so "Book 2.5" fits */
    position: real('position'),
  },
  (t) => [
    primaryKey({ columns: [t.collectionId, t.itemId] }),
    index('collection_items_item_idx').on(t.itemId),
  ],
);
