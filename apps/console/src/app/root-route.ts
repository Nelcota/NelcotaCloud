import { Outlet, createRootRoute } from '@tanstack/react-router'

/** The top of the route tree: the public pages and the console shell hang from it. */
export const rootRoute = createRootRoute({ component: Outlet })
