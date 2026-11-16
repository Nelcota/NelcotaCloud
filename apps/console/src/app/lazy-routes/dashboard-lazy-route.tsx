import { createLazyRoute } from '@tanstack/react-router'

import { DashboardPage } from '@/modules/dashboard/pages/dashboard-page'

/** Loaded on demand, so the page's code is its own chunk and not part of the first download. */
export const dashboardLazyRoute = createLazyRoute('/')({ component: DashboardPage })
