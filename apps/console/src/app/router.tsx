import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'

import { AuthLayout } from '@/app/auth-layout'
import { NotFoundPage } from '@/app/not-found-page'
import { RouteErrorPage } from '@/app/route-error-page'
import { AppShell } from '@/app/shell/app-shell'
import { nelcota } from '@/shared/auth/nelcota'
import { tokenSearch } from '@/shared/routing/token-search'

/**
 * Maps URLs to module pages; no logic lives here besides the login guard. Every page is a lazy
 * route: its code is downloaded the first time it is visited, or when a link to it is hovered.
 */
const rootRoute = createRootRoute({ component: Outlet })

/** Login and the pages opened from emails, outside the console shell. */
const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_public',
  component: AuthLayout,
})

const loginRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/login',
  beforeLoad: () => {
    if (nelcota.auth.getSession() !== null) {
      throw redirect({ to: '/' })
    }
  },
}).lazy(() => import('@/app/lazy-routes/login').then((module) => module.loginLazyRoute))

const verifyEmailRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/auth/verify-email',
  validateSearch: tokenSearch,
}).lazy(() =>
  import('@/app/lazy-routes/verify-email').then((module) => module.verifyEmailLazyRoute),
)

const resetPasswordRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/auth/reset-password',
  validateSearch: tokenSearch,
}).lazy(() =>
  import('@/app/lazy-routes/reset-password').then((module) => module.resetPasswordLazyRoute),
)

/** Everything below needs a console session and lives in the console shell. */
const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_authenticated',
  component: AppShell,
  beforeLoad: () => {
    if (nelcota.auth.getSession() === null) {
      throw redirect({ to: '/login' })
    }
  },
})

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

const usersRoute = createRoute({ getParentRoute: () => projectRoute, path: '/users' }).lazy(() =>
  import('@/app/lazy-routes/users').then((module) => module.usersLazyRoute),
)

const providersRoute = createRoute({ getParentRoute: () => projectRoute, path: '/providers' }).lazy(
  () => import('@/app/lazy-routes/providers').then((module) => module.providersLazyRoute),
)

const emailRoute = createRoute({ getParentRoute: () => projectRoute, path: '/email' }).lazy(() =>
  import('@/app/lazy-routes/email').then((module) => module.emailLazyRoute),
)

const teamRoute = createRoute({ getParentRoute: () => projectRoute, path: '/team' }).lazy(() =>
  import('@/app/lazy-routes/team').then((module) => module.teamLazyRoute),
)

const settingsRoute = createRoute({ getParentRoute: () => projectRoute, path: '/settings' }).lazy(
  () => import('@/app/lazy-routes/settings').then((module) => module.settingsLazyRoute),
)

const routeTree = rootRoute.addChildren([
  publicRoute.addChildren([loginRoute, verifyEmailRoute, resetPasswordRoute]),
  authenticatedRoute.addChildren([
    projectsRoute,
    newProjectRoute,
    accountRoute,
    projectRoute.addChildren([
      overviewRoute,
      apiKeysRoute,
      usersRoute,
      providersRoute,
      emailRoute,
      teamRoute,
      settingsRoute,
    ]),
  ]),
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultErrorComponent: RouteErrorPage,
  defaultNotFoundComponent: NotFoundPage,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
