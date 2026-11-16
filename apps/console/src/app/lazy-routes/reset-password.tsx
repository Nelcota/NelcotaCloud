import { createLazyRoute } from '@tanstack/react-router'

import { ResetPasswordPage } from '@/modules/account/pages/reset-password-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const resetPasswordLazyRoute = createLazyRoute('/_public/auth/reset-password')({
  component: ResetPasswordPage,
})
