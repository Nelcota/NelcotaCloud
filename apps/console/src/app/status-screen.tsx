import type { LucideIcon } from 'lucide-react'
import type { JSX, ReactNode } from 'react'

import { cn } from '@/shared/lib/class-names'
import { LogoMark } from '@/shared/ui/logo-mark'

type StatusScreenProps = {
  icon: LucideIcon
  tone: 'danger' | 'neutral'
  title: string
  description: string
  actions: ReactNode
  children?: ReactNode
}

const TONES: Record<StatusScreenProps['tone'], { glow: string; badge: string }> = {
  danger: {
    glow: 'bg-destructive/10',
    badge: 'bg-destructive/10 text-destructive ring-destructive/20',
  },
  neutral: {
    glow: 'bg-primary/10',
    badge: 'bg-primary/10 text-primary ring-primary/20',
  },
}

/**
 * A full-screen message (an error, a missing page). It covers the screen because the router
 * renders it inside whichever layout the route belongs to.
 */
export function StatusScreen(props: StatusScreenProps): JSX.Element {
  const tone = TONES[props.tone]
  const Icon = props.icon

  return (
    <div className="bg-background fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto px-4 py-12">
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none fixed top-1/3 left-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl',
          tone.glow,
        )}
      />
      <section className="relative w-full max-w-md text-center">
        <LogoMark className="mx-auto mb-10 size-9" />
        <span
          className={cn(
            'mx-auto flex size-14 items-center justify-center rounded-2xl ring-1',
            tone.badge,
          )}
        >
          <Icon className="size-7" strokeWidth={1.75} />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{props.title}</h1>
        <p className="text-muted-foreground mt-2 text-sm text-balance">{props.description}</p>
        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">{props.actions}</div>
        {props.children}
      </section>
    </div>
  )
}
