import { createRoute, createRouter, redirect } from '@tanstack/react-router'

import { NotFoundPage } from '@/app/not-found-page'
import { publicRouteTree } from '@/app/public-routes'
import { rootRoute } from '@/app/root-route'
import { RouteErrorPage } from '@/app/route-error-page'
import { PAGE_SCROLLER_SELECTOR } from '@/app/shell/page-scroller'
import { parseActivitySearch } from '@/modules/activity/model/activity-search'
import { parseUserDetailSearch } from '@/modules/users/model/user-detail-search'
import { parseUsersSearch } from '@/modules/users/model/users-search'
import { nelcota } from '@/shared/auth/nelcota'

/**
 * Maps URLs to module pages; no logic lives here besides the login guard. Every page is a lazy
 * route: its code is downloaded the first time it is visited, or when a link to it is hovered.
 * Everything here needs a console session and lives in the console shell.
 */
const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_authenticated',
  beforeLoad: () => {
    if (nelcota.auth.getSession() === null) {
      throw redirect({ to: '/login' })
    }
  },
}).lazy(() =>
  import('@/app/lazy-routes/authenticated').then((module) => module.authenticatedLazyRoute),
)

const projectsRoute = createRoute({ getParentRoute: () => authenticatedRoute, path: '/' }).lazy(
  () => import('@/app/lazy-routes/projects').then((module) => module.projectsLazyRoute),
)

const newProjectRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/projects/new',
}).lazy(() => import('@/app/lazy-routes/new-project').then((module) => module.newProjectLazyRoute))

const accountRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/account',
}).lazy(() => import('@/app/lazy-routes/account').then((module) => module.accountLazyRoute))

const projectRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/projects/$projectId',
})

const overviewRoute = createRoute({ getParentRoute: () => projectRoute, path: '/' }).lazy(() =>
  import('@/app/lazy-routes/overview').then((module) => module.overviewLazyRoute),
)

const apiKeysRoute = createRoute({ getParentRoute: () => projectRoute, path: '/keys' }).lazy(() =>
  import('@/app/lazy-routes/api-keys').then((module) => module.apiKeysLazyRoute),
)

const usersRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/users',
  validateSearch: parseUsersSearch,
}).lazy(() => import('@/app/lazy-routes/users').then((module) => module.usersLazyRoute))

const userDetailRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/users/$userId',
  validateSearch: parseUserDetailSearch,
}).lazy(() => import('@/app/lazy-routes/user-detail').then((module) => module.userDetailLazyRoute))

const providersRoute = createRoute({ getParentRoute: () => projectRoute, path: '/providers' }).lazy(
  () => import('@/app/lazy-routes/providers').then((module) => module.providersLazyRoute),
)

const emailRoute = createRoute({ getParentRoute: () => projectRoute, path: '/email' }).lazy(() =>
  import('@/app/lazy-routes/email').then((module) => module.emailLazyRoute),
)
const webhooksRoute = createRoute({ getParentRoute: () => projectRoute, path: '/webhooks' }).lazy(
  () => import('@/app/lazy-routes/webhooks').then((module) => module.webhooksLazyRoute),
)

const databaseRoute = createRoute({ getParentRoute: () => projectRoute, path: '/database' }).lazy(
  () => import('@/app/lazy-routes/database').then((module) => module.databaseLazyRoute),
)

const cacheRoute = createRoute({ getParentRoute: () => projectRoute, path: '/cache' }).lazy(() =>
  import('@/app/lazy-routes/cache').then((module) => module.cacheLazyRoute),
)

const databaseTableRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/database/$table',
}).lazy(() =>
  import('@/app/lazy-routes/database-table').then((module) => module.databaseTableLazyRoute),
)

const sqlEditorRoute = createRoute({ getParentRoute: () => projectRoute, path: '/sql' }).lazy(() =>
  import('@/app/lazy-routes/sql-editor').then((module) => module.sqlEditorLazyRoute),
)

const migrationsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/migrations',
}).lazy(() => import('@/app/lazy-routes/migrations').then((module) => module.migrationsLazyRoute))

const activityRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/activity',
  validateSearch: parseActivitySearch,
}).lazy(() => import('@/app/lazy-routes/activity').then((module) => module.activityLazyRoute))

const teamRoute = createRoute({ getParentRoute: () => projectRoute, path: '/team' }).lazy(() =>
  import('@/app/lazy-routes/team').then((module) => module.teamLazyRoute),
)

const settingsRoute = createRoute({ getParentRoute: () => projectRoute, path: '/settings' }).lazy(
  () => import('@/app/lazy-routes/settings').then((module) => module.settingsLazyRoute),
)

const routeTree = rootRoute.addChildren([
  publicRouteTree,
  authenticatedRoute.addChildren([
    projectsRoute,
    newProjectRoute,
    accountRoute,
    projectRoute.addChildren([
      overviewRoute,
      apiKeysRoute,
      usersRoute,
      userDetailRoute,
      providersRoute,
      emailRoute,
      webhooksRoute,
      databaseRoute,
      cacheRoute,
      databaseTableRoute,
      sqlEditorRoute,
      migrationsRoute,
      activityRoute,
      teamRoute,
      settingsRoute,
    ]),
  ]),
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  // The page panel scrolls, not the window: new pages start at its top, and Back returns to
  // where the reader was (a long list, after opening one of its rows).
  scrollRestoration: true,
  scrollToTopSelectors: [PAGE_SCROLLER_SELECTOR],
  defaultErrorComponent: RouteErrorPage,
  defaultNotFoundComponent: NotFoundPage,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
