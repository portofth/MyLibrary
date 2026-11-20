import { eq } from 'drizzle-orm';
import { DEFAULT_SETTINGS, settingsSchema, type SettingKey, type Settings } from '@mylibrary/core';
import type { DB } from './client';
import { settings } from './schema';

/** All settings, with defaults for unset or invalid (e.g. outdated) values. */
export function getSettings(db: DB): Settings {
  const result: Settings = { ...DEFAULT_SETTINGS };
  for (const row of db.select().from(settings).all()) {
    const key = row.key as SettingKey;
    if (!(key in settingsSchema.shape)) continue;
    const parsed = settingsSchema.shape[key].safeParse(row.value);
    if (parsed.success) (result as Record<string, unknown>)[key] = parsed.data;
  }
  return result;
}

export function setSetting<K extends SettingKey>(db: DB, key: K, value: Settings[K]): Settings[K] {
  const parsed = settingsSchema.shape[key].parse(value) as Settings[K];
  db.insert(settings)
    .values({ key, value: parsed })
    .onConflictDoUpdate({ target: settings.key, set: { value: parsed, updatedAt: Date.now() } })
    .run();
  return parsed;
}

export function resetSetting(db: DB, key: SettingKey): void {
  db.delete(settings).where(eq(settings.key, key)).run();
}
