import { createLazyRoute } from '@tanstack/react-router'

import { NewProjectPage } from '@/modules/projects/pages/new-project-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const newProjectLazyRoute = createLazyRoute('/_authenticated/projects/new')({
  component: NewProjectPage,
})
