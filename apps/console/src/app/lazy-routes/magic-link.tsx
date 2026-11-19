import { createLazyRoute } from '@tanstack/react-router'

import { MagicLinkPage } from '@/modules/account/pages/magic-link-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const magicLinkLazyRoute = createLazyRoute('/_public/auth/magic-link')({
  component: MagicLinkPage,
})
