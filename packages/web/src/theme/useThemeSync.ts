import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '../lib/trpc';

const STORAGE_KEY = 'mylibrary.theme';

export function applyTheme(theme: 'system' | 'light' | 'dark') {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage unavailable (private mode) — theme still applies for this session
  }
}

/** Keeps <html data-theme> in sync with the saved setting. */
export function useThemeSync() {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.settings.get.queryOptions());
  useEffect(() => {
    if (data) applyTheme(data.theme);
  }, [data]);
}
