import type { JSX, ReactNode } from 'react'

import { LogoMark } from '@/shared/ui/logo-mark'

type StatusScreenProps = {
  title: string
  description: ReactNode
  actions: ReactNode
  /** The evidence beside the message: the error report, the missing status code. */
  aside: ReactNode
}

const ENTER = 'animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-500 ease-out'

/**
 * A full-screen message (an error, a missing page). It covers the screen because the router
 * renders it inside whichever layout the route belongs to.
 */
export function StatusScreen(props: StatusScreenProps): JSX.Element {
  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4 sm:px-6">
        <LogoMark className="size-7" />
        <span className="text-sm font-semibold tracking-tight">NelcotaCloud</span>
      </header>
      <main className="mx-auto grid w-full max-w-5xl flex-1 content-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
        <section className={ENTER}>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-[2.75rem] sm:leading-[1.1]">
            {props.title}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-md text-sm text-pretty">
            {props.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">{props.actions}</div>
        </section>
        <div className={`${ENTER} delay-150`}>{props.aside}</div>
      </main>
    </div>
  )
}
