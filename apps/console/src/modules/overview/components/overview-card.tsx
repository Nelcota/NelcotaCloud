import { Link } from '@tanstack/react-router'
import ArrowRight from '~icons/solar/arrow-right-linear'
import type { IconComponent } from '@/shared/ui/icon-component'
import type { JSX } from 'react'

import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

export type OverviewLink = {
  label: string
  to: string
}

type OverviewCardProps = {
  icon: IconComponent
  title: string
  metricLabel: string
  /** `null` while loading; the card shows a placeholder instead of a made-up number. */
  value: string | null
  /** A failed load replaces the placeholder, so the card never waits forever. */
  error: Error | null
  onRetry: () => void
  /** `null` while loading; a placeholder line stands in for it. */
  detail: string | null
  links: OverviewLink[]
}

/** One area of the project: its key figure, a line of context, and where to act on it. */
export function OverviewCard(props: OverviewCardProps): JSX.Element {
  const Icon = props.icon

  return (
    <section className="bg-card flex flex-col rounded-xl border">
      <header className="flex items-center gap-2.5 px-5 pt-5 text-sm font-medium">
        <Icon aria-hidden="true" className="text-muted-foreground size-5" />
        <h2>{props.title}</h2>
      </header>
      <div className="flex-1 px-5 pt-4 pb-5">
        <p className="text-muted-foreground text-sm">{props.metricLabel}</p>
        <MetricValue value={props.value} error={props.error} onRetry={props.onRetry} />
        <Detail detail={props.detail} isLoading={props.value === null && props.error === null} />
      </div>
      <footer className="flex flex-wrap gap-x-5 gap-y-1 border-t px-5 py-3 text-sm">
        {props.links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group text-muted-foreground hover:text-foreground inline-flex min-h-8 items-center gap-1 transition-colors"
          >
            {link.label}
            <ArrowRight className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5" />
          </Link>
        ))}
      </footer>
    </section>
  )
}

function Detail({
  detail,
  isLoading,
}: {
  detail: string | null
  isLoading: boolean
}): JSX.Element | null {
  if (detail === null && isLoading) {
    return null
  }

  if (detail === null) {
    return <Skeleton className="mt-2 h-3 w-40" />
  }

  return <p className="text-muted-foreground mt-1 text-xs text-pretty">{detail}</p>
}

type MetricValueProps = {
  value: string | null
  error: Error | null
  onRetry: () => void
}

function MetricValue({ value, error, onRetry }: MetricValueProps): JSX.Element {
  if (error !== null) {
    return (
      <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-destructive">Não foi possível carregar.</span>
        <Button variant="outline" size="xs" onClick={onRetry}>
          Tentar de novo
        </Button>
      </div>
    )
  }

  if (value === null) {
    return <Skeleton className="mt-2 h-8 w-20" />
  }

  return <p className="mt-1 truncate text-3xl font-semibold tracking-tight">{value}</p>
}
