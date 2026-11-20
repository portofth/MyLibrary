import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { AppShell } from './components/AppShell';
import { LibraryPage } from './features/library/LibraryPage';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { StatusPage } from './features/status/StatusPage';

const rootRoute = createRootRoute({ component: AppShell });

const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: LibraryPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/analytics', component: AnalyticsPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/status', component: StatusPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: SettingsPage }),
]);

export const router = createRouter({ routeTree, defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
