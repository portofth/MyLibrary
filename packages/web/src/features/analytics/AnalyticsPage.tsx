import { Card, PageHeader } from '../../components/ui';

export function AnalyticsPage() {
  return (
    <>
      <PageHeader title="Analytics" subtitle="Consumption habits across every dimension." />
      <Card>
        <p className="text-sm text-muted">
          Yearly totals and the activity heatmap arrive in Phase 1; the full dashboard in Phase 3.
        </p>
      </Card>
    </>
  );
}
