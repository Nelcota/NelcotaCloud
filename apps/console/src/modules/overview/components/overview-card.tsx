import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import type { JSX } from 'react'

import { Skeleton } from '@/shared/ui/skeleton'

export type OverviewLink = {
  label: string
  to: string
}

type OverviewCardProps = {
  icon: LucideIcon
  title: string
  metricLabel: string
  /** `null` while loading; the card shows a placeholder instead of a made-up number. */
  value: string | null
  detail: string
  links: OverviewLink[]
}

/** One area of the project: its key figure, a line of context, and where to act on it. */
export function OverviewCard(props: OverviewCardProps): JSX.Element {
  const Icon = props.icon

  return (
    <section className="bg-card flex flex-col rounded-xl border">
      <header className="flex items-center gap-2.5 px-5 pt-5 text-sm font-medium">
        <span className="bg-primary/10 flex size-7 items-center justify-center rounded-md">
          <Icon className="text-primary size-4" strokeWidth={1.75} />
        </span>
        <h2>{props.title}</h2>
      </header>
      <div className="flex-1 px-5 pt-4 pb-5">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {props.metricLabel}
        </p>
        <MetricValue value={props.value} />
        <p className="text-muted-foreground mt-1 text-xs text-pretty">{props.detail}</p>
      </div>
      <footer className="flex flex-wrap gap-x-5 gap-y-1 border-t px-5 py-3 text-sm">
        {props.links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group text-muted-foreground hover:text-foreground inline-flex min-h-8 items-center gap-1 transition-colors"
          >
            {link.label}
            <ArrowRight
              className="size-3.5 transition-transform motion-safe:group-hover:translate-x-0.5"
              strokeWidth={1.75}
            />
          </Link>
        ))}
      </footer>
    </section>
  )
}

function MetricValue({ value }: { value: string | null }): JSX.Element {
  if (value === null) {
    return <Skeleton className="mt-2 h-8 w-20" />
  }

  return <p className="mt-1 truncate text-3xl font-semibold tracking-tight">{value}</p>
}
