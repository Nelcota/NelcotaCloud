import { createLazyRoute } from '@tanstack/react-router'

import { CachePage } from '@/modules/cache/pages/cache-page'

export const cacheLazyRoute = createLazyRoute('/_authenticated/projects/$projectId/cache')({
  component: CachePage,
})
