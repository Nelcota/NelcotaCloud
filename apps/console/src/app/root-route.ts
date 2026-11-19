import { Outlet, createRootRoute } from '@tanstack/react-router'
import { type JSX, createElement, useEffect } from 'react'

import { queryClient } from '@/app/query-client'
import { nelcota } from '@/shared/auth/nelcota'

function SessionOutlet(): JSX.Element {
  useEffect(() => {
    let accountId = nelcota.auth.getSession()?.user.id

    return nelcota.auth.onAuthStateChange(() => {
      const currentId = nelcota.auth.getSession()?.user.id

      if (currentId !== accountId) {
        accountId = currentId
        queryClient.clear()
      }
    })
  }, [])

  return createElement(Outlet)
}

/** The top of the route tree, shared by the public pages and the console shell. */
export const rootRoute = createRootRoute({ component: SessionOutlet })
