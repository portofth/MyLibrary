import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '../../lib/trpc';
import { Card, ErrorNote, PageHeader } from '../../components/ui';
import { formatBytes, formatDateTime } from '../../lib/format';

export function StatusPage() {
  const trpc = useTRPC();
  const { data, error } = useQuery(trpc.system.status.queryOptions());

  return (
    <>
      <PageHeader title="Status" subtitle="Where your data lives and how it is doing." />
      <ErrorNote error={error} />
      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Library">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted">Data folder</dt>
              <dd className="font-mono text-xs break-all">{data.dataDir}</dd>
              <dt className="text-muted">Version</dt>
              <dd>{data.version}</dd>
              <dt className="text-muted">Network</dt>
              <dd>
                {data.host}:{data.port} {data.lan ? '(LAN enabled)' : '(this computer only)'}
              </dd>
              <dt className="text-muted">Last backup</dt>
              <dd>{data.lastBackup ? formatDateTime(data.lastBackup.createdAt) : 'none yet'}</dd>
            </dl>
          </Card>
          <Card title="Contents">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted">Items</dt>
              <dd>{data.counts.items}</dd>
              <dt className="text-muted">Consumptions</dt>
              <dd>{data.counts.consumptions}</dd>
              <dt className="text-muted">Progress events</dt>
              <dd>{data.counts.progressEvents}</dd>
              <dt className="text-muted">Stored files</dt>
              <dd>
                {data.storage.files.files} ({formatBytes(data.storage.files.bytes)})
              </dd>
              <dt className="text-muted">Covers</dt>
              <dd>
                {data.storage.covers.files} ({formatBytes(data.storage.covers.bytes)})
              </dd>
            </dl>
          </Card>
        </div>
      )}
    </>
  );
}
