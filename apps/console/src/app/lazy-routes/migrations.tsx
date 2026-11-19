import { createLazyRoute } from '@tanstack/react-router'

import { MigrationsPage } from '@/modules/database/migrations/pages/migrations-page'

export const migrationsLazyRoute = createLazyRoute(
  '/_authenticated/projects/$projectId/migrations',
)({
  component: MigrationsPage,
})
