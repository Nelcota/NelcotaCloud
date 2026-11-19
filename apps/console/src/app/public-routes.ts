import { createRoute, redirect } from '@tanstack/react-router'

import { AuthLayout } from '@/app/auth-layout'
import { rootRoute } from '@/app/root-route'
import { parseLoginSearch } from '@/modules/account/model/login-search'
import { nelcota } from '@/shared/auth/nelcota'

/** Login and the pages opened from emails or a provider's redirect, outside the console shell. */
const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_public',
  component: AuthLayout,
})

const loginRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/login',
  validateSearch: parseLoginSearch,
  beforeLoad: () => {
    if (nelcota.auth.getSession() !== null) {
      throw redirect({ to: '/' })
    }
  },
}).lazy(() => import('@/app/lazy-routes/login').then((module) => module.loginLazyRoute))

const verifyEmailRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/auth/verify-email',
}).lazy(() =>
  import('@/app/lazy-routes/verify-email').then((module) => module.verifyEmailLazyRoute),
)

const resetPasswordRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/auth/reset-password',
}).lazy(() =>
  import('@/app/lazy-routes/reset-password').then((module) => module.resetPasswordLazyRoute),
)

const oauthCallbackRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/auth/callback',
}).lazy(() =>
  import('@/app/lazy-routes/oauth-callback').then((module) => module.oauthCallbackLazyRoute),
)

const magicLinkRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/auth/magic-link',
}).lazy(() => import('@/app/lazy-routes/magic-link').then((module) => module.magicLinkLazyRoute))

export const publicRouteTree = publicRoute.addChildren([
  loginRoute,
  verifyEmailRoute,
  resetPasswordRoute,
  oauthCallbackRoute,
  magicLinkRoute,
])
