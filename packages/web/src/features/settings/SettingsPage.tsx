import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabaseBackup } from 'lucide-react';
import { useTRPC } from '../../lib/trpc';
import { applyTheme } from '../../theme/useThemeSync';
import { Button, Card, ErrorNote, PageHeader, Segmented } from '../../components/ui';
import { formatBytes, formatDateTime } from '../../lib/format';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function SettingsPage() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const settings = useQuery(trpc.settings.get.queryOptions());
  const backups = useQuery(trpc.system.backups.list.queryOptions());

  const update = useMutation(
    trpc.settings.update.mutationOptions({
      onSuccess: (data) => qc.setQueryData(trpc.settings.get.queryKey(), data),
    }),
  );
  const backupNow = useMutation(
    trpc.system.backups.create.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.system.backups.list.queryKey() });
        void qc.invalidateQueries({ queryKey: trpc.system.status.queryKey() });
      },
    }),
  );

  const s = settings.data;
  return (
    <>
      <PageHeader title="Settings" />
      <ErrorNote error={settings.error ?? update.error} />
      <div className="grid gap-4">
        {s && (
          <Card title="Appearance & calendar">
            <div className="grid gap-4 sm:grid-cols-[10rem_1fr] sm:items-center">
              <span className="text-sm text-muted">Theme</span>
              <Segmented
                label="Theme"
                value={s.theme}
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
                onChange={(theme) => {
                  applyTheme(theme);
                  update.mutate({ theme });
                }}
              />
              <label htmlFor="week-start" className="text-sm text-muted">
                Week starts on
              </label>
              <select
                id="week-start"
                value={s.weekStartsOn}
                onChange={(e) => update.mutate({ weekStartsOn: Number(e.target.value) })}
                className="w-48 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
              <span className="text-sm text-muted">Rating scale</span>
              <Segmented
                label="Rating scale"
                value={String(s.ratingScale) as '5' | '10' | '100'}
                options={[
                  { value: '5', label: '5 ★' },
                  { value: '10', label: '10' },
                  { value: '100', label: '100' },
                ]}
                onChange={(v) => update.mutate({ ratingScale: Number(v) as 5 | 10 | 100 })}
              />
            </div>
          </Card>
        )}

        <Card
          title="Backups"
          actions={
            <Button onClick={() => backupNow.mutate()} disabled={backupNow.isPending}>
              <DatabaseBackup className="size-4" aria-hidden />
              {backupNow.isPending ? 'Backing up…' : 'Back up now'}
            </Button>
          }
        >
          <p className="mb-3 text-sm text-muted">
            The database is snapshotted automatically every day. Media files are immutable, so
            copying the whole data folder is always a complete backup.
          </p>
          <ErrorNote error={backups.error ?? backupNow.error} />
          {backups.data?.length === 0 && <p className="text-sm text-muted">No backups yet.</p>}
          <ul className="divide-y divide-border text-sm">
            {backups.data?.map((b) => (
              <li key={b.name} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="font-mono text-xs break-all">{b.name}</span>
                <span className="text-muted">
                  {formatDateTime(b.createdAt)} · {formatBytes(b.sizeBytes)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
