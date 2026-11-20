import { asc, isNull } from 'drizzle-orm';
import { schema } from '@mylibrary/db';
import { router, publicProcedure } from '../trpc';

export const mediaTypesRouter = router({
  list: publicProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(schema.mediaTypes)
      .where(isNull(schema.mediaTypes.archivedAt))
      .orderBy(asc(schema.mediaTypes.sortOrder), asc(schema.mediaTypes.name))
      .all(),
  ),
});
