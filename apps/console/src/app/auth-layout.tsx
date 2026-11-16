import { Outlet } from '@tanstack/react-router'
import type { JSX } from 'react'

import { LogoMark } from '@/shared/ui/logo-mark'

/** Login and the pages opened from emails: the form alone, centered under the mark. */
export function AuthLayout(): JSX.Element {
  return (
    <main className="bg-background flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <LogoMark className="size-9" />
        <span className="text-lg font-semibold tracking-tight">NelcotaCloud</span>
      </div>
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </main>
  )
}
