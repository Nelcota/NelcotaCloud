import { Outlet } from '@tanstack/react-router'
import type { JSX } from 'react'

/**
 * Login and the pages opened from emails, framed like the signed-in console: the shell around
 * one rounded panel, with the mascots, the heading and the form in one centered column and the
 * way to switch pages at the panel's foot.
 */
export function AuthLayout(): JSX.Element {
  return (
    <div className="bg-shell flex min-h-svh md:p-2">
      <main className="bg-background flex min-w-0 flex-1 flex-col items-center px-4 py-8 sm:px-6 md:rounded-2xl md:border">
        <div className="flex w-full max-w-sm flex-1 flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
