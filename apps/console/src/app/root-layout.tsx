import { Link, Outlet } from '@tanstack/react-router'
import type { JSX } from 'react'

/** The shell around every page: header and the routed page below it. */
export function RootLayout(): JSX.Element {
  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          <Link to="/" className="font-heading text-sm font-semibold tracking-tight">
            NelcotaCloud
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  )
}
