import { createLazyRoute } from '@tanstack/react-router'

import { DatabasePage } from '@/modules/database/pages/database-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const databaseLazyRoute = createLazyRoute('/_authenticated/projects/$projectId/database')({
  component: DatabasePage,
})
