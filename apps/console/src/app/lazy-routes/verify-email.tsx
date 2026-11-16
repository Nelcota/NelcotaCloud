import { createLazyRoute } from '@tanstack/react-router'

import { VerifyEmailPage } from '@/modules/account/pages/verify-email-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const verifyEmailLazyRoute = createLazyRoute('/_public/auth/verify-email')({
  component: VerifyEmailPage,
})
