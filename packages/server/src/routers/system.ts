import { count } from 'drizzle-orm';
import { schema } from '@mylibrary/db';
import { router, publicProcedure } from '../trpc';
import { APP_VERSION } from '../version';

export const systemRouter = router({
  health: publicProcedure.query(() => ({ ok: true as const, version: APP_VERSION })),

  status: publicProcedure.query(async ({ ctx }) => {
    const { services, db } = ctx;
    const counts = {
      items: db.select({ n: count() }).from(schema.items).get()?.n ?? 0,
      people: db.select({ n: count() }).from(schema.people).get()?.n ?? 0,
      consumptions: db.select({ n: count() }).from(schema.consumptions).get()?.n ?? 0,
      progressEvents: db.select({ n: count() }).from(schema.progressEvents).get()?.n ?? 0,
      itemFiles: db.select({ n: count() }).from(schema.itemFiles).get()?.n ?? 0,
    };
    const [files, covers] = await Promise.all([services.files.usage(), services.covers.usage()]);
    const latest = services.backups.latest();
    return {
      version: APP_VERSION,
      dataDir: services.config.paths.root,
      startedAt: services.startedAt,
      lan: services.config.lan,
      host: services.config.host,
      port: services.config.port,
      clientIsLoopback: ctx.clientIsLoopback,
      counts,
      storage: { files, covers },
      lastBackup: latest
        ? { name: latest.name, createdAt: latest.createdAt, sizeBytes: latest.sizeBytes }
        : null,
    };
  }),

  backups: router({
    list: publicProcedure.query(({ ctx }) =>
      ctx.services.backups
        .list()
        .map(({ name, createdAt, sizeBytes }) => ({ name, createdAt, sizeBytes })),
    ),
    create: publicProcedure.mutation(async ({ ctx }) => {
      const { name, createdAt, sizeBytes } = await ctx.services.backups.create('manual');
      return { name, createdAt, sizeBytes };
    }),
  }),
});
