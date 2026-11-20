/**
 * Calendar-day helpers. Days are stored as local `YYYY-MM-DD` strings so a late-night
 * session always lands on the day the user experienced it, independent of timezone.
 * All arithmetic is done in UTC on the *calendar* value to avoid DST surprises.
 */
import type { TimeBucket } from './enums';

export type LocalDate = string; // YYYY-MM-DD

const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const PARTIAL_DATE_RE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

export function isLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== 'string') return false;
  const m = LOCAL_DATE_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
  return (
    d.getUTCFullYear() === +m[1]! && d.getUTCMonth() === +m[2]! - 1 && d.getUTCDate() === +m[3]!
  );
}

/** `YYYY`, `YYYY-MM` or `YYYY-MM-DD` (e.g. publication dates). */
export function isPartialDate(value: unknown): value is string {
  if (typeof value !== 'string' || !PARTIAL_DATE_RE.test(value)) return false;
  if (value.length === 10) return isLocalDate(value);
  if (value.length === 7) {
    const month = +value.slice(5, 7);
    return month >= 1 && month <= 12;
  }
  return true;
}

/** The local calendar day of an instant, in the runtime's timezone. */
export function toLocalDate(date: Date = new Date()): LocalDate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toUtc(d: LocalDate): Date {
  if (!isLocalDate(d)) throw new Error(`Invalid local date: ${d}`);
  return new Date(`${d}T00:00:00Z`);
}

function fromUtc(d: Date): LocalDate {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: LocalDate, days: number): LocalDate {
  const u = toUtc(d);
  u.setUTCDate(u.getUTCDate() + days);
  return fromUtc(u);
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(d: LocalDate): number {
  return toUtc(d).getUTCDay();
}

export function diffDays(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

/**
 * Bucket key for a day. Labels: day `YYYY-MM-DD`, week = first day of the week
 * `YYYY-MM-DD` (respecting weekStartsOn), month `YYYY-MM`, quarter `YYYY-Qn`, year `YYYY`.
 */
export function bucketKey(d: LocalDate, bucket: TimeBucket, weekStartsOn = 1): string {
  switch (bucket) {
    case 'day':
      return d;
    case 'week': {
      const offset = (dayOfWeek(d) - weekStartsOn + 7) % 7;
      return addDays(d, -offset);
    }
    case 'month':
      return d.slice(0, 7);
    case 'quarter':
      return `${d.slice(0, 4)}-Q${Math.floor((+d.slice(5, 7) - 1) / 3) + 1}`;
    case 'year':
      return d.slice(0, 4);
  }
}

/** All bucket keys covering [from, to] (inclusive), in order — used to zero-fill charts. */
export function enumerateBuckets(
  from: LocalDate,
  to: LocalDate,
  bucket: TimeBucket,
  weekStartsOn = 1,
): string[] {
  if (from > to) return [];
  const keys: string[] = [];
  let cursor = from;
  let last: string | undefined;
  while (cursor <= to) {
    const key = bucketKey(cursor, bucket, weekStartsOn);
    if (key !== last) {
      keys.push(key);
      last = key;
    }
    cursor =
      bucket === 'day' || bucket === 'week'
        ? addDays(cursor, bucket === 'day' ? 1 : 7 - ((dayOfWeek(cursor) - weekStartsOn + 7) % 7))
        : nextPeriodStart(cursor, bucket);
  }
  return keys;
}

function nextPeriodStart(d: LocalDate, bucket: 'month' | 'quarter' | 'year'): LocalDate {
  const y = +d.slice(0, 4);
  const m = +d.slice(5, 7) - 1;
  const next =
    bucket === 'month'
      ? new Date(Date.UTC(y, m + 1, 1))
      : bucket === 'quarter'
        ? new Date(Date.UTC(y, Math.floor(m / 3) * 3 + 3, 1))
        : new Date(Date.UTC(y + 1, 0, 1));
  return fromUtc(next);
}
