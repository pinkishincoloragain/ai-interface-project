import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { z } from 'zod';
import React from 'react';

// Lazy imports
const App = React.lazy(() => import('../../App'));
const LandingPage = React.lazy(() => import('../../pages/landing').then((module) => ({ default: module.LandingPage })));
const SettingsPage = React.lazy(() =>
    import('../../pages/settings').then((module) => ({ default: module.SettingsPage }))
);

// Root route
const rootRoute = createRootRoute({
    component: () => <Outlet />,
});

// Landing page route
const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
        <React.Suspense fallback={<div>Loading...</div>}>
            <LandingPage />
        </React.Suspense>
    ),
});

// Chat route
const chatRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/chat',
    component: () => (
        <React.Suspense fallback={<div>Loading...</div>}>
            <App />
        </React.Suspense>
    ),
});

// Settings route
const settingsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/settings',
    component: () => (
        <React.Suspense fallback={<div>Loading...</div>}>
            <SettingsPage />
        </React.Suspense>
    ),
});

// Thread route with dynamic ID
const threadRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/thread/$threadId',
    validateSearch: z.object({
        tab: z.enum(['chat', 'settings']).optional(),
    }),
    component: () => (
        <React.Suspense fallback={<div>Loading...</div>}>
            <App />
        </React.Suspense>
    ),
});

// Create route tree
const routeTree = rootRoute.addChildren([indexRoute, chatRoute, settingsRoute, threadRoute]);

// Create router
export const router = createRouter({ routeTree });

// Register router types
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
