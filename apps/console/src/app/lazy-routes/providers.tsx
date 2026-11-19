import { createLazyRoute } from '@tanstack/react-router'

import { ProvidersPage } from '@/modules/project-settings/oauth-providers/pages/providers-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const providersLazyRoute = createLazyRoute('/_authenticated/projects/$projectId/providers')({
  component: ProvidersPage,
})
