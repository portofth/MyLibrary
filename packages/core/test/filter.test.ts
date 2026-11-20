import { describe, expect, it } from 'vitest';
import { andFilters, filterSchema, type FilterNode } from '../src';

const ok = (f: unknown) => filterSchema.safeParse(f).success;

describe('filterSchema', () => {
  it('accepts a realistic nested filter', () => {
    const f: FilterNode = {
      op: 'and',
      children: [
        { field: 'mediaType', cmp: 'in', value: ['book', 'audiobook'] },
        { field: 'people.author', cmp: 'any', value: ['0192f5a0-0000-7000-8000-000000000000'] },
        { op: 'not', child: { field: 'status', cmp: 'eq', value: 'dropped' } },
        { field: 'rating', cmp: 'between', value: [3, 5] },
        { field: 'fields.edition', cmp: 'isNotNull' },
        { field: 'tags.0192f5a0-0000-7000-8000-000000000001', cmp: 'all', value: ['x'] },
      ],
    };
    expect(ok(f)).toBe(true);
  });

  it('rejects unknown fields and injection-looking paths', () => {
    expect(ok({ field: 'title; DROP TABLE items', cmp: 'eq', value: 'x' })).toBe(false);
    expect(ok({ field: 'fields.Bad-Key', cmp: 'eq', value: 'x' })).toBe(false);
    expect(ok({ field: 'people.wizard', cmp: 'any', value: [] })).toBe(false);
  });

  it('checks value shape per comparator', () => {
    expect(ok({ field: 'title', cmp: 'in', value: 'x' })).toBe(false);
    expect(ok({ field: 'rating', cmp: 'between', value: [1] })).toBe(false);
    expect(ok({ field: 'title', cmp: 'isNull', value: 'x' })).toBe(false);
    expect(ok({ field: 'title', cmp: 'contains', value: 3 })).toBe(false);
    expect(ok({ field: 'title', cmp: 'eq' })).toBe(false);
    expect(ok({ field: 'title', cmp: 'eq', value: 'Dune', extra: 1 })).toBe(false);
  });

  it('enforces depth limit', () => {
    let node: FilterNode = { field: 'title', cmp: 'eq', value: 'x' };
    for (let i = 0; i < 10; i++) node = { op: 'not', child: node };
    expect(ok(node)).toBe(false);
  });

  it('andFilters combines and drops empties', () => {
    const a: FilterNode = { field: 'title', cmp: 'eq', value: 'a' };
    expect(andFilters(null, undefined)).toBeNull();
    expect(andFilters(a, null)).toBe(a);
    expect(andFilters(a, a)).toEqual({ op: 'and', children: [a, a] });
  });
});
