import { createLazyRoute } from '@tanstack/react-router'

import { ProjectsPage } from '@/modules/projects/pages/projects-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const projectsLazyRoute = createLazyRoute('/_authenticated/')({ component: ProjectsPage })
