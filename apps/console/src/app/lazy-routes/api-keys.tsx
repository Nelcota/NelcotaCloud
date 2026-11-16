import { createLazyRoute } from '@tanstack/react-router'

import { ApiKeysPage } from '@/modules/api-keys/pages/api-keys-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const apiKeysLazyRoute = createLazyRoute('/_authenticated/projects/$projectId/')({
  component: ApiKeysPage,
})
