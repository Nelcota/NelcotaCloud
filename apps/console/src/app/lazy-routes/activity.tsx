import { createLazyRoute } from '@tanstack/react-router'

import { ActivityPage } from '@/modules/activity/pages/activity-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const activityLazyRoute = createLazyRoute('/_authenticated/projects/$projectId/activity')({
  component: ActivityPage,
})
