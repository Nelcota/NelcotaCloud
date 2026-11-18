import { createLazyRoute } from '@tanstack/react-router'

import { TablePage } from '@/modules/database/pages/table-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const databaseTableLazyRoute = createLazyRoute(
  '/_authenticated/projects/$projectId/database/$table',
)({
  component: TablePage,
})
