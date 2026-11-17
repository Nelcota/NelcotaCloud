import { Outlet, useLocation } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useEffect } from 'react'

const PAGE_TITLES: Record<string, string> = {
  '/login': 'Entrar · NelcotaCloud',
  '/auth/verify-email': 'Confirmar email · NelcotaCloud',
  '/auth/reset-password': 'Redefinir senha · NelcotaCloud',
}
const DEFAULT_TITLE = 'NelcotaCloud'

/** Login and the pages opened from emails: one card in the middle of the screen. */
export function AuthLayout(): JSX.Element {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? DEFAULT_TITLE

  useEffect(() => {
    document.title = title
  }, [title])

  return (
    <main className="bg-background flex min-h-svh items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-[30rem]">
        <Outlet />
      </div>
    </main>
  )
}
