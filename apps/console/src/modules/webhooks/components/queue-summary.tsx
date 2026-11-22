import type { JSX } from 'react'

import { formatQueueCount, queueVerdict } from '@/modules/webhooks/components/queue-verdict'
import { useWebhookQueueHealthQuery } from '@/modules/webhooks/queries/use-webhook-queue-health'
import type { components } from '@/shared/api/api-schema'
import { formatRelative } from '@/shared/lib/format-relative'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { StatCard } from '@/shared/ui/stat-card'
import { SummarySentence } from '@/shared/ui/summary-sentence'

type QueueHealth = components['schemas']['QueueHealth']

type QueueSummaryProps = {
  projectId: string
  /** Endpoints the project has, active or paused, and how many it may have. */
  endpoints: { count: number; limit: number }
}

/** The whole project's delivery queue: a verdict, then what waits, what is late and what failed. */
export function QueueSummary({ projectId, endpoints }: QueueSummaryProps): JSX.Element {
  const queue = useWebhookQueueHealthQuery(projectId)
  const health = queue.data

  if (health === undefined && queue.isError) {
    return <LoadError error={queue.error} onRetry={() => queue.refetch()} />
  }

  if (health === undefined) {
    return <QueueSkeleton />
  }

  const verdict = queueVerdict(health)

  return (
    <div className="flex flex-col gap-4">
      <SummarySentence tone={verdict.tone} verdict={verdict.verdict}>
        <span className="tabular-nums">{verdict.sentence}</span>
      </SummarySentence>
      <div className="grid grid-cols-2 gap-3 @min-[48rem]:grid-cols-4 @min-[48rem]:gap-4">
        <StatCard
          label="Endpoints ativos"
          value={health.active_endpoints}
          hint={`De ${endpoints.count} cadastrados, até ${endpoints.limit}`}
        />
        <StatCard
          label="Na fila"
          value={formatQueueCount(health.pending)}
          hint="Esperando envio ou nova tentativa"
        />
        <StatCard
          label="Atrasadas"
          value={formatQueueCount(health.overdue)}
          hint={oldestOverdue(health)}
        />
        <StatCard
          label="Falhas em 24 h"
          value={formatQueueCount(health.failed_last_day)}
          hint="Desistiram depois de 28 h de tentativas"
        />
      </div>
    </div>
  )
}

function oldestOverdue(health: QueueHealth): string {
  const seconds = health.oldest_overdue_seconds

  if (seconds === null || seconds === undefined || health.overdue.value === 0) {
    return 'Nenhuma passou da hora'
  }

  const observedAt = Date.parse(health.observed_at)
  const dueAt = new Date(observedAt - seconds * 1000).toISOString()

  return `A mais antiga venceu ${formatRelative(dueAt, observedAt)}`
}

const SKELETON_CARDS = ['active', 'pending', 'overdue', 'failed']

function QueueSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-12 rounded-xl" />
      <div className="grid grid-cols-2 gap-3 @min-[48rem]:grid-cols-4 @min-[48rem]:gap-4">
        {SKELETON_CARDS.map((card) => (
          <Skeleton key={card} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
