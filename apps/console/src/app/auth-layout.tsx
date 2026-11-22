import { Outlet, useLocation } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useEffect } from 'react'

import { PublicFrame } from '@/modules/account/components/public-frame'

const PAGE_TITLES: Record<string, string> = {
  '/login': 'Entrar · NelcotaCloud',
  '/auth/verify-email': 'Confirmar email · NelcotaCloud',
  '/auth/reset-password': 'Redefinir senha · NelcotaCloud',
}
const DEFAULT_TITLE = 'NelcotaCloud'

/** Sets public page titles and frames the pages opened from account emails. */
export function AuthLayout(): JSX.Element {
  const { pathname } = useLocation()
  const publicPath = pathname.replace(/\/$/, '')
  const title = PAGE_TITLES[publicPath] ?? DEFAULT_TITLE

  useEffect(() => {
    document.title = title
  }, [title])

  if (publicPath === '/login') {
    return <Outlet />
  }

  return (
    <PublicFrame>
      <Outlet />
    </PublicFrame>
  )
}
