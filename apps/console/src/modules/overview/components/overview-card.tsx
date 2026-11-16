import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import type { JSX } from 'react'

export type OverviewLink = {
  label: string
  to: string
}

type OverviewCardProps = {
  icon: LucideIcon
  title: string
  metricLabel: string
  /** `null` while loading; the card shows a dash instead of a made-up number. */
  value: string | null
  detail: string
  links: OverviewLink[]
}

/** One area of the project: its key figure, a line of context, and where to act on it. */
export function OverviewCard(props: OverviewCardProps): JSX.Element {
  const Icon = props.icon

  return (
    <section className="bg-card flex flex-col rounded-xl border">
      <header className="flex items-center gap-2 px-5 pt-5 text-sm font-medium">
        <Icon className="text-primary size-4" strokeWidth={1.75} />
        <h2>{props.title}</h2>
      </header>
      <div className="flex-1 px-5 pt-4 pb-5">
        <p className="text-muted-foreground text-sm">{props.metricLabel}</p>
        <p className="mt-1 truncate text-3xl font-semibold tracking-tight">{props.value ?? '—'}</p>
        <p className="text-muted-foreground mt-1 text-xs">{props.detail}</p>
      </div>
      <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t px-5 py-3 text-sm">
        {props.links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </footer>
    </section>
  )
}
