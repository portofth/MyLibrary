/**
 * Progress units. Pages and minutes are never summed raw: analytics either stays in a
 * native unit or converts to *estimated minutes* using these rates (overridable in
 * settings and per item via items.minutes_per_unit).
 */
export const UNITS = [
  'page',
  'minute',
  'episode',
  'lesson',
  'chapter',
  'word',
  'item',
  'percent',
] as const;
export type Unit = (typeof UNITS)[number];

/** Default minutes needed to consume one unit. `null` = no meaningful conversion. */
export const DEFAULT_MINUTES_PER_UNIT: Record<Unit, number | null> = {
  page: 1.5, // ~40 pages/hour
  minute: 1,
  episode: 45,
  lesson: 10,
  chapter: 20,
  word: 1 / 238, // average adult silent reading speed
  item: null,
  percent: null,
};

export type UnitRates = Partial<Record<Unit, number | null>>;

/**
 * Convert an amount of `unit` to estimated minutes.
 * Precedence: item override > user settings > defaults. Returns null when not convertible.
 */
export function toEstimatedMinutes(
  amount: number,
  unit: Unit,
  opts: { itemMinutesPerUnit?: number | null; rates?: UnitRates } = {},
): number | null {
  const rate =
    opts.itemMinutesPerUnit ??
    (opts.rates && unit in opts.rates ? opts.rates[unit] : undefined) ??
    DEFAULT_MINUTES_PER_UNIT[unit];
  return rate == null ? null : amount * rate;
}
