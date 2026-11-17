import { Outlet } from '@tanstack/react-router'
import type { JSX } from 'react'

/** Login and the pages opened from emails: one card in the middle of the screen. */
export function AuthLayout(): JSX.Element {
  return (
    <main className="bg-background flex min-h-svh items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-[30rem]">
        <Outlet />
      </div>
    </main>
  )
}
