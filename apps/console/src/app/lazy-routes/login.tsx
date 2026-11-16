import { createLazyRoute } from '@tanstack/react-router'

import { LoginPage } from '@/modules/account/pages/login-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const loginLazyRoute = createLazyRoute('/login')({ component: LoginPage })
