import { createLazyRoute } from '@tanstack/react-router'

import { OAuthCallbackPage } from '@/modules/account/pages/oauth-callback-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const oauthCallbackLazyRoute = createLazyRoute('/_public/auth/callback')({
  component: OAuthCallbackPage,
})
