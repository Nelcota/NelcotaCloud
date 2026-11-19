import PlugCircle from '~icons/solar/plug-circle-linear'
import type { JSX } from 'react'

import { OverviewCard } from '@/modules/overview/components/overview-card'
import { countOrNull } from '@/modules/overview/components/overview-metrics'
import type { WebhookQueueQuery } from '@/modules/webhooks/queries/use-webhook-queue-health'

type WebhooksCardProps = { projectId: string; query: WebhookQueueQuery }

export function WebhooksCard({ projectId, query }: WebhooksCardProps): JSX.Element {
  const summary = cardSummary(query.data, query.error)
  const retry = (): void => {
    void query.refetch()
  }

  return (
    <OverviewCard
      icon={PlugCircle}
      label="Webhooks ativos"
      value={summary.value}
      error={summary.error}
      onRetry={retry}
      detail={summary.detail}
      to={`/projects/${projectId}/webhooks`}
    />
  )
}

type CardSummary = { value: string | null; error: Error | null; detail: string | null }

function cardSummary(state: WebhookQueueQuery['data'], error: Error | null): CardSummary {
  if (state === undefined) {
    return { value: null, error, detail: null }
  }

  if (state.kind === 'denied') {
    return { value: null, error: state.error, detail: null }
  }

  const { health, isDelayed } = state.reading
  const value = countOrNull(health.active_endpoints)

  if (error !== null) {
    return { value, error: null, detail: 'Dados desatualizados' }
  }

  if (isDelayed) {
    return { value, error: null, detail: 'Atraso nas entregas' }
  }

  if (health.active_endpoints === 0) {
    return { value, error: null, detail: 'Nenhum endpoint recebendo eventos' }
  }

  return { value, error: null, detail: 'Fila sem alerta' }
}
