import { createRoute, redirect } from '@tanstack/react-router'

import { AuthLayout } from '@/app/auth-layout'
import { rootRoute } from '@/app/root-route'
import { nelcota } from '@/shared/auth/nelcota'

/** Login and the pages opened from emails, outside the console shell. */
export const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_public',
  component: AuthLayout,
})

export const loginRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/login',
  beforeLoad: () => {
    if (nelcota.auth.getSession() !== null) {
      throw redirect({ to: '/' })
    }
  },
}).lazy(() => import('@/app/lazy-routes/login').then((module) => module.loginLazyRoute))

export const verifyEmailRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/auth/verify-email',
}).lazy(() =>
  import('@/app/lazy-routes/verify-email').then((module) => module.verifyEmailLazyRoute),
)

export const resetPasswordRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/auth/reset-password',
}).lazy(() =>
  import('@/app/lazy-routes/reset-password').then((module) => module.resetPasswordLazyRoute),
)
