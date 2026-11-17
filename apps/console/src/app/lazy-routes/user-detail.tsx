import { createLazyRoute } from '@tanstack/react-router'

import { UserDetailPage } from '@/modules/users/pages/user-detail-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const userDetailLazyRoute = createLazyRoute(
  '/_authenticated/projects/$projectId/users/$userId',
)({
  component: UserDetailPage,
})
