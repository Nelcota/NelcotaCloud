import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'

import { RootLayout } from '@/app/root-layout'

/**
 * Maps URLs to module pages; no logic lives here. Every page is a lazy route: its code is
 * downloaded the first time it is visited, or earlier when the user hovers a link to it.
 */
const rootRoute = createRootRoute({ component: RootLayout })

const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/' }).lazy(() =>
  import('@/app/lazy-routes/dashboard-lazy-route').then((module) => module.dashboardLazyRoute),
)

const routeTree = rootRoute.addChildren([dashboardRoute])

export const router = createRouter({ routeTree, defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
