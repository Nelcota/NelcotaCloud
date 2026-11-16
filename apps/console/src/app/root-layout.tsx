import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'

import { queryClient } from '@/app/query-client'
import { nelcota } from '@/shared/auth/nelcota'
import { useSession } from '@/shared/auth/use-session'
import { Button } from '@/shared/ui/button'

/** The shell around every page: header with the account, and the routed page below it. */
export function RootLayout(): JSX.Element {
  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <Link to="/" className="font-heading text-sm font-semibold tracking-tight">
            NelcotaCloud
          </Link>
          <AccountMenu />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  )
}

function AccountMenu(): JSX.Element | null {
  const session = useSession()
  const navigate = useNavigate()

  if (session === null) {
    return null
  }

  async function signOut(): Promise<void> {
    try {
      await nelcota.auth.signOut()
    } finally {
      queryClient.clear()
      await navigate({ to: '/login' })
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground hidden sm:inline">{session.user.email}</span>
      <Button variant="outline" size="sm" onClick={signOut}>
        Sair
      </Button>
    </div>
  )
}
