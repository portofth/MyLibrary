import { QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import type { AppRouter } from '@mylibrary/server/router';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

export const trpcClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: '/trpc' })],
});
