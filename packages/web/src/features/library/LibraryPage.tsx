import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '../../lib/trpc';
import { Card, ErrorNote, PageHeader } from '../../components/ui';

export function LibraryPage() {
  const trpc = useTRPC();
  const types = useQuery(trpc.mediaTypes.list.queryOptions());

  return (
    <>
      <PageHeader title="Library" subtitle="Your books, articles, podcasts, videos and courses." />
      <Card title="Media types">
        <ErrorNote error={types.error} />
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {types.data?.map((t) => (
            <li key={t.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
              <div className="font-medium">{t.namePlural}</div>
              <div className="text-xs text-muted">tracked in {t.primaryUnit}s</div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          Adding items, importing files and logging progress arrive in Phase 1.
        </p>
      </Card>
    </>
  );
}
