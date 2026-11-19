import { type JSX, useId } from 'react'

import type { QueueHealth } from '@/modules/webhooks/model/webhook-queue-health'
import {
  type QueueResult,
  useWebhookQueueHealth,
} from '@/modules/webhooks/queries/use-webhook-queue-health'
import { formatDateTime } from '@/shared/lib/format-date'
import { Button } from '@/shared/ui/button'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/skeleton'

const numberFormat = new Intl.NumberFormat('pt-BR')

export function WebhookQueuePanel({ projectId }: { projectId: string }): JSX.Element {
  const titleId = useId()
  const query = useWebhookQueueHealth(projectId)
  const state = query.data
  const retry = (): void => {
    void query.refetch()
  }

  return (
    <section aria-labelledby={titleId} className="surface grid gap-4 p-5">
      <h2 id={titleId} className="text-lg font-semibold">
        Fila de entregas
      </h2>
      <QueueReadout state={state} error={query.error} retry={retry} />
    </section>
  )
}

type ReadoutProps = {
  state: QueueResult | undefined
  error: Error | null
  retry: () => void
}

function QueueReadout({ state, error, retry }: ReadoutProps): JSX.Element {
  if (state?.kind === 'denied') {
    return <LoadError error={state.error} onRetry={retry} />
  }

  if (state === undefined && error !== null) {
    return (
      <>
        <p className="text-sm font-medium">Dados indisponíveis</p>
        <LoadError error={error} onRetry={retry} />
      </>
    )
  }

  if (state === undefined) {
    return <Skeleton className="h-20 w-full" />
  }

  const { health, isDelayed } = state.reading
  const status = queueStatus(isDelayed, error)

  return (
    <>
      <p role="status" className="text-sm font-medium">
        {status}
      </p>
      <dl className="border-border grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 sm:grid-cols-4">
        <QueueMetric label="Pendentes" value={formatCount(health.pending)} />
        <QueueMetric label="Atrasadas" value={formatCount(health.overdue)} />
        <QueueMetric label="Maior atraso" value={formatDelay(health.oldest_overdue_seconds)} />
        <QueueMetric label="Falhas em 24 h" value={formatCount(health.failed_last_day)} />
      </dl>
      <p className="text-muted-foreground text-xs">
        Atualizado em{' '}
        <time dateTime={health.observed_at}>{formatDateTime(health.observed_at)}</time>
      </p>
      <RetryStaleReading error={error} retry={retry} />
    </>
  )
}

function RetryStaleReading({
  error,
  retry,
}: {
  error: Error | null
  retry: () => void
}): JSX.Element | null {
  if (error === null) {
    return null
  }

  return (
    <Button className="justify-self-start" variant="outline" onClick={retry}>
      Tentar de novo
    </Button>
  )
}

function QueueMetric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="grid content-start gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function queueStatus(isDelayed: boolean, error: Error | null): string {
  if (error !== null) {
    return 'Dados desatualizados'
  }

  if (isDelayed) {
    return 'Atraso nas entregas'
  }

  return 'Fila sem alerta'
}

function formatCount(count: QueueHealth['pending']): string {
  const amount = numberFormat.format(count.value)

  if (count.is_capped) {
    return `${amount}+`
  }

  return amount
}

function formatDelay(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) {
    return '—'
  }

  if (seconds >= 3_600) {
    return `${numberFormat.format(Math.floor(seconds / 3_600))} h ${Math.floor((seconds % 3_600) / 60)} min`
  }

  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)} min ${seconds % 60} s`
  }

  if (seconds === 0) {
    return '< 1 s'
  }

  return `${seconds} s`
}
