import { createLazyRoute } from '@tanstack/react-router'

import { UsersPage } from '@/modules/users/pages/users-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const usersLazyRoute = createLazyRoute('/_authenticated/projects/$projectId/users')({
  component: UsersPage,
})
