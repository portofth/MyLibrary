import { settingsSchema } from '@mylibrary/core';
import { getSettings, setSetting } from '@mylibrary/db';
import { router, publicProcedure } from '../trpc';

export const settingsRouter = router({
  get: publicProcedure.query(({ ctx }) => getSettings(ctx.db)),

  update: publicProcedure.input(settingsSchema.partial()).mutation(({ ctx, input }) => {
    ctx.db.transaction((tx) => {
      for (const [key, value] of Object.entries(input) as Array<[keyof typeof input, unknown]>) {
        if (value !== undefined) setSetting(tx, key, value as never);
      }
    });
    return getSettings(ctx.db);
  }),
});
