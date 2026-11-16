import { createLazyRoute } from '@tanstack/react-router'

import { TeamPage } from '@/modules/team/pages/team-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const teamLazyRoute = createLazyRoute('/_authenticated/projects/$projectId/team')({
  component: TeamPage,
})
