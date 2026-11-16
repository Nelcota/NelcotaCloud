import { createLazyRoute } from '@tanstack/react-router'

import { AccountPage } from '@/modules/account/pages/account-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const accountLazyRoute = createLazyRoute('/_authenticated/account')({
  component: AccountPage,
})
