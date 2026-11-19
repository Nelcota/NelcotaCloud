import ArrowRight from '~icons/solar/arrow-right-linear'
import type { JSX, ReactNode } from 'react'

import { Button } from '@/shared/ui/button'
import type { IconComponent } from '@/shared/ui/icon-component'
import { Skeleton } from '@/shared/ui/skeleton'

export type MetricCardBodyProps = {
  icon: IconComponent
  label: string
  /** `null` while loading; the card shows a placeholder instead of a made-up number. */
  value: string | null
  /** A failed load replaces the placeholder, so the card never waits forever. */
  error: Error | null
  onRetry: () => void
  /** A line of context; `null` while loading shows a placeholder line. */
  detail: ReactNode
  /** The card leads somewhere, so an arrow shows on hover. */
  hasArrow?: boolean
}

/** One figure: what it counts, the number, and a line of context. */
export function MetricCardBody(props: MetricCardBodyProps): JSX.Element {
  const Icon = props.icon

  return (
    <>
      <span className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
        <Icon aria-hidden="true" className="size-5" />
        <span className="flex-1">{props.label}</span>
        <HoverArrow hasArrow={props.hasArrow === true} />
      </span>
      <MetricValue value={props.value} error={props.error} onRetry={props.onRetry} />
      <Detail detail={props.detail} isLoading={props.value === null && props.error === null} />
    </>
  )
}

function HoverArrow({ hasArrow }: { hasArrow: boolean }): JSX.Element | null {
  if (hasArrow === false) {
    return null
  }

  return (
    <ArrowRight
      aria-hidden="true"
      className="size-4 opacity-0 transition-[opacity,transform] group-hover:opacity-100 motion-safe:group-hover:translate-x-0.5"
    />
  )
}

type DetailProps = { detail: ReactNode; isLoading: boolean }

function Detail({ detail, isLoading }: DetailProps): JSX.Element | null {
  if (detail === null && isLoading) {
    return <Skeleton className="mt-auto h-3 w-32" />
  }

  if (detail === null) {
    return null
  }

  return <div className="text-muted-foreground mt-auto text-xs text-pretty">{detail}</div>
}

type MetricValueProps = { value: string | null; error: Error | null; onRetry: () => void }

function MetricValue({ value, error, onRetry }: MetricValueProps): JSX.Element {
  if (error !== null) {
    return <MetricError onRetry={onRetry} />
  }

  if (value === null) {
    return <Skeleton className="h-9 w-20" />
  }

  return <p className="truncate text-3xl font-bold tracking-tight tabular-nums">{value}</p>
}

function MetricError({ onRetry }: { onRetry: () => void }): JSX.Element {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-destructive">Não foi possível carregar.</span>
      <Button variant="outline" size="xs" onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  )
}
