import { describe, expect, it } from 'vitest';
import { toEstimatedMinutes } from '../src';

describe('toEstimatedMinutes', () => {
  it('uses defaults', () => {
    expect(toEstimatedMinutes(40, 'page')).toBe(60);
    expect(toEstimatedMinutes(30, 'minute')).toBe(30);
    expect(toEstimatedMinutes(1, 'item')).toBeNull();
  });

  it('prefers item override, then settings, then defaults', () => {
    expect(toEstimatedMinutes(10, 'page', { rates: { page: 2 } })).toBe(20);
    expect(toEstimatedMinutes(10, 'page', { rates: { page: 2 }, itemMinutesPerUnit: 3 })).toBe(30);
    expect(toEstimatedMinutes(10, 'item', { rates: { item: 15 } })).toBe(150);
  });
});
