/** User settings stored in the `settings` table (key → JSON). Defaults apply when unset. */
import { z } from 'zod';
import { UNITS } from './units';

export const THEMES = ['system', 'light', 'dark'] as const;

export const settingsSchema = z.object({
  theme: z.enum(THEMES),
  /** 0 = Sunday … 6 = Saturday */
  weekStartsOn: z.number().int().min(0).max(6),
  /** Overrides for DEFAULT_MINUTES_PER_UNIT. */
  minutesPerUnit: z.partialRecord(z.enum(UNITS), z.number().positive().nullable()),
  /** Max value of the rating scale shown in the UI (stored ratings are always 0–5). */
  ratingScale: z.union([z.literal(5), z.literal(10), z.literal(100)]),
});
export type Settings = z.infer<typeof settingsSchema>;
export type SettingKey = keyof Settings;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  weekStartsOn: 1,
  minutesPerUnit: {},
  ratingScale: 5,
};
