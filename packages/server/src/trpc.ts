import { initTRPC } from '@trpc/server';
import type { RequestContext } from './context';

const t = initTRPC.context<RequestContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
