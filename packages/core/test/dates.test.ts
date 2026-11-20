import { describe, expect, it } from 'vitest';
import { addDays, bucketKey, diffDays, enumerateBuckets, isLocalDate, isPartialDate } from '../src';

describe('date validation', () => {
  it('validates local dates strictly', () => {
    expect(isLocalDate('2026-02-28')).toBe(true);
    expect(isLocalDate('2026-02-29')).toBe(false);
    expect(isLocalDate('2024-02-29')).toBe(true);
    expect(isLocalDate('2026-13-01')).toBe(false);
    expect(isLocalDate('2026-1-01')).toBe(false);
  });

  it('accepts partial dates', () => {
    expect(isPartialDate('1999')).toBe(true);
    expect(isPartialDate('1999-12')).toBe(true);
    expect(isPartialDate('1999-13')).toBe(false);
    expect(isPartialDate('1999-02-30')).toBe(false);
  });
});

describe('arithmetic', () => {
  it('crosses month/year boundaries and DST-free', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-01-01', '2026-12-31')).toBe(364);
  });
});

describe('bucketKey', () => {
  // 2026-11-20 is a Friday
  it('buckets weeks by configurable start day', () => {
    expect(bucketKey('2026-11-20', 'week', 1)).toBe('2026-11-16'); // Monday start
    expect(bucketKey('2026-11-20', 'week', 0)).toBe('2026-11-15'); // Sunday start
    expect(bucketKey('2026-11-16', 'week', 1)).toBe('2026-11-16');
  });

  it('buckets month, quarter, year', () => {
    expect(bucketKey('2026-11-20', 'month')).toBe('2026-11');
    expect(bucketKey('2026-11-20', 'quarter')).toBe('2026-Q4');
    expect(bucketKey('2026-01-01', 'quarter')).toBe('2026-Q1');
    expect(bucketKey('2026-11-20', 'year')).toBe('2026');
  });
});

describe('enumerateBuckets', () => {
  it('lists every bucket in range, inclusive', () => {
    expect(enumerateBuckets('2026-01-30', '2026-02-02', 'day')).toEqual([
      '2026-01-30',
      '2026-01-31',
      '2026-02-01',
      '2026-02-02',
    ]);
    expect(enumerateBuckets('2026-11-01', '2026-11-20', 'week', 1)).toEqual([
      '2026-10-26',
      '2026-11-02',
      '2026-11-09',
      '2026-11-16',
    ]);
    expect(enumerateBuckets('2025-11-15', '2026-02-01', 'month')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
    expect(enumerateBuckets('2025-12-31', '2026-07-01', 'quarter')).toEqual([
      '2025-Q4',
      '2026-Q1',
      '2026-Q2',
      '2026-Q3',
    ]);
    expect(enumerateBuckets('2024-06-01', '2026-01-01', 'year')).toEqual(['2024', '2025', '2026']);
    expect(enumerateBuckets('2026-02-01', '2026-01-01', 'day')).toEqual([]);
  });
});
