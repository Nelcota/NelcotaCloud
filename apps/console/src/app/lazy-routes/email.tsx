import { createLazyRoute } from '@tanstack/react-router'

import { EmailPage } from '@/modules/project-settings/pages/email-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const emailLazyRoute = createLazyRoute('/_authenticated/projects/$projectId/email')({
  component: EmailPage,
})
