import { createLazyRoute } from '@tanstack/react-router'

import { AppShell } from '@/app/shell/app-shell'

export const authenticatedLazyRoute = createLazyRoute('/_authenticated')({ component: AppShell })
