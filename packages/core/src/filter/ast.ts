/**
 * The unified filter language. One JSON AST drives library views, saved views, goals and
 * every analytics widget. `db` compiles it to parameterized SQL — it is never interpolated.
 */
import { z } from 'zod';
import { PERSON_ROLES } from '../enums';

export const FILTER_BASE_FIELDS = [
  'id',
  'title',
  'mediaType',
  'status',
  'format',
  'rating',
  'language',
  'publisher',
  'publishedOn',
  'startedOn',
  'finishedOn',
  'createdAt',
  'people',
  'tags',
  'collection',
  'hasFiles',
  'fileFormat',
] as const;
export type FilterBaseField = (typeof FILTER_BASE_FIELDS)[number];

export const FILTER_COMPARATORS = [
  'eq',
  'neq',
  'in',
  'nin',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'contains',
  'startsWith',
  'isNull',
  'isNotNull',
  'any',
  'all',
  'none',
] as const;
export type FilterComparator = (typeof FILTER_COMPARATORS)[number];

export type FilterScalar = string | number | boolean;
export type FilterValue = FilterScalar | FilterScalar[] | null;

export interface FilterCondition {
  field: string;
  cmp: FilterComparator;
  value?: FilterValue;
}
export interface FilterGroup {
  op: 'and' | 'or';
  children: FilterNode[];
}
export interface FilterNot {
  op: 'not';
  child: FilterNode;
}
export type FilterNode = FilterGroup | FilterNot | FilterCondition;

export const MAX_FILTER_DEPTH = 8;
export const MAX_FILTER_NODES = 200;

const SLUG = '[a-z0-9_]{1,64}';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const FIELD_RE = new RegExp(
  `^(?:${FILTER_BASE_FIELDS.join('|')}|people\\.(?:${PERSON_ROLES.join('|')})|tags\\.${UUID}|fields\\.${SLUG})$`,
);

export function isValidFilterField(field: string): boolean {
  return FIELD_RE.test(field);
}

const scalar = z.union([z.string().max(1000), z.number().finite(), z.boolean()]);
const LIST_CMPS = new Set<FilterComparator>(['in', 'nin', 'any', 'all', 'none']);
const NO_VALUE_CMPS = new Set<FilterComparator>(['isNull', 'isNotNull']);

export const filterConditionSchema = z
  .object({
    field: z.string().refine(isValidFilterField, { message: 'Unknown filter field' }),
    cmp: z.enum(FILTER_COMPARATORS),
    value: z.union([scalar, z.array(scalar).max(500), z.null()]).optional(),
  })
  .strict()
  .superRefine((c, ctx) => {
    const v = c.value;
    if (NO_VALUE_CMPS.has(c.cmp)) {
      if (v !== undefined && v !== null)
        ctx.addIssue({ code: 'custom', message: `${c.cmp} takes no value` });
    } else if (LIST_CMPS.has(c.cmp)) {
      if (!Array.isArray(v))
        ctx.addIssue({ code: 'custom', message: `${c.cmp} requires an array value` });
    } else if (c.cmp === 'between') {
      if (!Array.isArray(v) || v.length !== 2)
        ctx.addIssue({ code: 'custom', message: 'between requires [min, max]' });
    } else if (v === undefined || v === null || Array.isArray(v)) {
      ctx.addIssue({ code: 'custom', message: `${c.cmp} requires a single value` });
    } else if ((c.cmp === 'contains' || c.cmp === 'startsWith') && typeof v !== 'string') {
      ctx.addIssue({ code: 'custom', message: `${c.cmp} requires a string value` });
    }
  });

export const filterNodeSchema: z.ZodType<FilterNode> = z.lazy(() =>
  z.union([
    z.object({ op: z.enum(['and', 'or']), children: z.array(filterNodeSchema).max(100) }).strict(),
    z.object({ op: z.literal('not'), child: filterNodeSchema }).strict(),
    filterConditionSchema,
  ]),
);

/** Validated filter AST, with depth and size limits enforced. */
export const filterSchema = filterNodeSchema.superRefine((node, ctx) => {
  const { depth, nodes } = measure(node);
  if (depth > MAX_FILTER_DEPTH)
    ctx.addIssue({ code: 'custom', message: `Filter nested deeper than ${MAX_FILTER_DEPTH}` });
  if (nodes > MAX_FILTER_NODES)
    ctx.addIssue({ code: 'custom', message: `Filter has more than ${MAX_FILTER_NODES} nodes` });
});

function measure(node: FilterNode, depth = 1): { depth: number; nodes: number } {
  if ('children' in node) {
    return node.children.reduce(
      (acc, child) => {
        const m = measure(child, depth + 1);
        return { depth: Math.max(acc.depth, m.depth), nodes: acc.nodes + m.nodes };
      },
      { depth, nodes: 1 },
    );
  }
  if ('child' in node) {
    const m = measure(node.child, depth + 1);
    return { depth: m.depth, nodes: m.nodes + 1 };
  }
  return { depth, nodes: 1 };
}

export function isGroup(n: FilterNode): n is FilterGroup {
  return 'children' in n;
}
export function isNot(n: FilterNode): n is FilterNot {
  return 'child' in n;
}
export function isCondition(n: FilterNode): n is FilterCondition {
  return 'field' in n;
}

/** Combine filters with AND, dropping empties. Handy for "view filter AND dashboard filter". */
export function andFilters(...filters: Array<FilterNode | null | undefined>): FilterNode | null {
  const parts = filters.filter((f): f is FilterNode => f != null);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!;
  return { op: 'and', children: parts };
}
