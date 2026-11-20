import { router } from '../trpc';
import { mediaTypesRouter } from './mediaTypes';
import { settingsRouter } from './settings';
import { systemRouter } from './system';

export const appRouter = router({
  system: systemRouter,
  settings: settingsRouter,
  mediaTypes: mediaTypesRouter,
});

export type AppRouter = typeof appRouter;
