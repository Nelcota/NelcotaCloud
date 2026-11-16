import { createLazyRoute } from '@tanstack/react-router'

import { OverviewPage } from '@/modules/overview/pages/overview-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const overviewLazyRoute = createLazyRoute('/_authenticated/projects/$projectId/')({
  component: OverviewPage,
})
