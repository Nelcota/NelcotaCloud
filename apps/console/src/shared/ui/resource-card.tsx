import type { JSX, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { RouterLink } from '@/shared/routing/router-link'
import type { IconComponent } from '@/shared/ui/icon-component'

export type ResourceShortcut = { label: string; href: string; icon: IconComponent }

export type ResourceMetric = { label: string; value: ReactNode }

type ResourceCardProps = {
  name: string
  href: string
  /** What the resource is ("Postgres + Auth"), under the name. */
  kind: ReactNode
  leading: ReactNode
  /** A web address or identifier, in the mono face. */
  address?: ReactNode
  /** Status chips on one row: state on the left, visibility on the right. */
  status?: ReactNode
  aside?: ReactNode
  metrics?: readonly ResourceMetric[]
  shortcuts?: readonly ResourceShortcut[]
  /** Controls that sit above the stretched link, such as a copy button. */
  extra?: ReactNode
  /** 3 when the cards sit under a section heading of their own; 2 by default. */
  headingLevel?: 2 | 3
}

const HEADINGS = { 2: 'h2', 3: 'h3' } as const

/** A resource on the canvas: name and kind, its address, status chips, key numbers and shortcuts. */
export function ResourceCard(props: ResourceCardProps): JSX.Element {
  const Heading = HEADINGS[props.headingLevel ?? 2]

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl bg-card border border-border/60 transition-[border-color] duration-200 hover:border-muted-foreground/30">
      <div className="flex flex-col gap-3 p-3">
        <header className="flex min-w-0 items-start gap-2.5">
          {props.leading}
          <div className="grid min-w-0 flex-1">
            <Heading className="truncate text-sm font-medium text-heading">
              <RouterLink
                href={props.href}
                className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
              >
                {props.name}
              </RouterLink>
            </Heading>
            <span className="truncate text-2xs text-muted-foreground">{props.kind}</span>
          </div>
          {props.aside}
        </header>
        <ResourceAddress address={props.address} />
        <div className="flex min-w-0 items-center justify-between gap-2 text-2xs">
          {props.status}
        </div>
        <ResourceMetrics metrics={props.metrics} />
        {props.extra}
      </div>
      <ResourceShortcuts shortcuts={props.shortcuts} />
    </article>
  )
}

function ResourceAddress({ address }: { address?: ReactNode }): JSX.Element | null {
  if (address === undefined || address === null) {
    return null
  }

  return <p className="truncate font-mono text-xs text-muted-foreground">{address}</p>
}

function ResourceMetrics({ metrics }: { metrics?: readonly ResourceMetric[] }): JSX.Element | null {
  if (metrics === undefined || metrics.length === 0) {
    return null
  }

  return (
    <dl className="grid grid-cols-2 gap-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="grid min-w-0 gap-0.5">
          <dt className="truncate text-xs text-muted-foreground">{metric.label}</dt>
          <dd className="truncate font-mono text-xs font-semibold text-foreground tabular-nums">
            {metric.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function ResourceShortcuts({
  shortcuts,
}: {
  shortcuts?: readonly ResourceShortcut[]
}): JSX.Element | null {
  if (shortcuts === undefined || shortcuts.length === 0) {
    return null
  }

  return (
    <nav
      aria-label="Atalhos"
      className="relative z-10 grid grid-cols-3 gap-y-1 border-t border-border/60 px-1 py-1.5"
    >
      {shortcuts.map((shortcut) => {
        const Glyph = shortcut.icon

        return (
          <RouterLink
            key={shortcut.href}
            href={shortcut.href}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-md px-1 py-1 text-2xs text-muted-foreground hover:bg-surface hover:text-foreground',
            )}
          >
            <Glyph aria-hidden className="size-4.5" />
            <span className="truncate">{shortcut.label}</span>
          </RouterLink>
        )
      })}
    </nav>
  )
}
