import { Outlet } from '@tanstack/react-router'
import type { JSX } from 'react'

import { LogoMark } from '@/shared/ui/logo-mark'

/** Login and the pages opened from emails: the form alone, centered under the mark. */
export function AuthLayout(): JSX.Element {
  return (
    <main className="bg-background relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden="true"
        className="bg-primary/10 pointer-events-none absolute top-0 left-1/2 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
      />
      <div className="relative mb-8 flex items-center gap-3">
        <LogoMark className="size-10" />
        <span className="text-lg font-semibold tracking-tight">NelcotaCloud</span>
      </div>
      <div className="relative w-full max-w-sm">
        <Outlet />
      </div>
    </main>
  )
}
