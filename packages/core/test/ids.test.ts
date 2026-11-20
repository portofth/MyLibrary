import { describe, expect, it } from 'vitest';
import { idTimestamp, isId, newId } from '../src';

describe('newId (uuidv7)', () => {
  it('produces valid, unique, version-7 ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId()));
    expect(ids.size).toBe(1000);
    for (const id of ids) {
      expect(isId(id)).toBe(true);
      expect(id[14]).toBe('7');
      expect('89ab').toContain(id[19]);
    }
  });

  it('is sortable by creation time and embeds the timestamp', () => {
    const a = newId(1_700_000_000_000);
    const b = newId(1_700_000_000_001);
    expect(a < b).toBe(true);
    expect(idTimestamp(a)).toBe(1_700_000_000_000);
  });
});
