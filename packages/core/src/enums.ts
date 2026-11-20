/** Shared enumerations. The DB stores these as text; zod/TS use the literal unions. */

export const CONSUMPTION_STATUSES = [
  'planned',
  'in_progress',
  'paused',
  'completed',
  'dropped',
] as const;
export type ConsumptionStatus = (typeof CONSUMPTION_STATUSES)[number];

export const CONSUMPTION_FORMATS = [
  'print',
  'ebook',
  'audiobook',
  'pdf',
  'web',
  'video',
  'audio',
  'other',
] as const;
export type ConsumptionFormat = (typeof CONSUMPTION_FORMATS)[number];

export const PERSON_ROLES = [
  'author',
  'editor',
  'translator',
  'narrator',
  'illustrator',
  'host',
  'guest',
  'director',
  'creator',
  'instructor',
] as const;
export type PersonRole = (typeof PERSON_ROLES)[number];

export const FILE_ROLES = ['main', 'alternate', 'snapshot', 'supplement'] as const;
export type FileRole = (typeof FILE_ROLES)[number];

export const PROGRESS_SOURCES = ['manual', 'viewer', 'import'] as const;
export type ProgressSource = (typeof PROGRESS_SOURCES)[number];

export const IDENTIFIER_SCHEMES = [
  'isbn13',
  'isbn10',
  'asin',
  'doi',
  'url',
  'guid',
  'other',
] as const;
export type IdentifierScheme = (typeof IDENTIFIER_SCHEMES)[number];

export const FIELD_KINDS = [
  'text',
  'long_text',
  'number',
  'integer',
  'date',
  'boolean',
  'url',
  'select',
  'multi_select',
  'rating',
] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];

export const COLLECTION_KINDS = ['series', 'show', 'playlist', 'course', 'list'] as const;
export type CollectionKind = (typeof COLLECTION_KINDS)[number];

export const NOTE_KINDS = ['note', 'quote', 'highlight'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export const VIEW_MODES = ['grid', 'list', 'table'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const GOAL_PERIODS = ['year', 'month', 'week', 'custom'] as const;
export type GoalPeriod = (typeof GOAL_PERIODS)[number];

export const GOAL_METRICS = [
  'items_completed',
  'units',
  'estimated_minutes',
  'active_days',
] as const;
export type GoalMetric = (typeof GOAL_METRICS)[number];

export const TIME_BUCKETS = ['day', 'week', 'month', 'quarter', 'year'] as const;
export type TimeBucket = (typeof TIME_BUCKETS)[number];
