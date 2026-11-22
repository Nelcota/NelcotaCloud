import { useId, type JSX, type ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import type { IconComponent } from '@/shared/ui/icon-component'

type SectionProps = {
  title: string
  /** One line under the title: what the section is for. */
  description?: ReactNode
  /** A quiet figure after the title, such as "3 de 5". */
  meta?: ReactNode
  /** A control at the end of the heading, such as a filter or an "add" button. */
  action?: ReactNode
  icon?: IconComponent
  /** Keeps the title for screen readers where the page already shows it. */
  hideHeader?: boolean
  /** Draws the content inside a bordered panel, like the charts and tables of the console. */
  isFramed?: boolean
  children: ReactNode
  className?: string
}

/** A page region with a heading, optional context and one action. */
export function Section(props: SectionProps): JSX.Element {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className={cn('flex min-w-0 flex-col gap-3', props.className)}
    >
      <SectionHeading {...props} titleId={titleId} />
      <SectionBody isFramed={props.isFramed}>{props.children}</SectionBody>
    </section>
  )
}

function SectionHeading(props: SectionProps & { titleId: string }): JSX.Element {
  const Glyph = props.icon

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3',
        props.hideHeader === true && 'sr-only',
      )}
    >
      <div className="grid min-w-0 gap-0.5">
        <div className="flex items-center gap-2">
          {Glyph !== undefined && <Glyph aria-hidden className="size-4.5 text-muted-foreground" />}
          <h2 id={props.titleId} className="text-base font-medium">
            {props.title}
          </h2>
          {props.meta !== undefined && (
            <span className="text-xs text-muted-foreground tabular-nums">{props.meta}</span>
          )}
        </div>
        {props.description !== undefined && (
          <div className="max-w-prose text-xs text-muted-foreground">{props.description}</div>
        )}
      </div>
      {props.action}
    </div>
  )
}

function SectionBody({
  isFramed,
  children,
}: {
  isFramed?: boolean
  children: ReactNode
}): JSX.Element {
  if (isFramed === true) {
    return (
      <div className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card">
        {children}
      </div>
    )
  }

  return <>{children}</>
}
