import { Link, Outlet } from '@tanstack/react-router';
import { BarChart3, Library, Settings, Activity } from 'lucide-react';
import { useThemeSync } from '../theme/useThemeSync';

const NAV = [
  { to: '/', label: 'Library', icon: Library },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/status', label: 'Status', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

export function AppShell() {
  useThemeSync();
  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface p-3 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2 pt-2">
          <img src="/favicon.svg" alt="" className="size-7" />
          <span className="text-lg font-semibold tracking-tight">MyLibrary</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === '/' }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg"
              activeProps={{ className: 'bg-surface-2 !text-fg font-medium' }}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto px-4 pt-6 pb-24 sm:px-8 md:pb-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Phone bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === '/' }}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-xs text-muted"
            activeProps={{ className: '!text-accent' }}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
