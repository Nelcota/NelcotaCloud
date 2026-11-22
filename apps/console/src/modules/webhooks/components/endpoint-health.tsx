import type { JSX } from 'react'

import { summarizeDeliveries } from '@/modules/webhooks/components/delivery-summary'
import { healthSentence } from '@/modules/webhooks/components/endpoint-health-sentence'
import {
  type EndpointHealthState,
  HEALTH,
  type HealthAction,
  healthKindOf,
} from '@/modules/webhooks/components/endpoint-health-state'
import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'
import { TestResultStrip } from '@/modules/webhooks/components/test-result-strip'
import { type EndpointTestSend, isTestShown } from '@/modules/webhooks/components/test-send-state'
import { useWebhookDeliveriesQuery } from '@/modules/webhooks/queries/use-webhook-deliveries'
import { LoadError } from '@/shared/ui/load-error'
import { Button } from '@/shared/ui/primitives/button'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { SummarySentence } from '@/shared/ui/summary-sentence'

type EndpointHealthProps = {
  projectId: string
  endpoint: WebhookEndpoint
  /** A test send replaces the health for a moment with its answer. */
  test: EndpointTestSend
  onAction: (action: HealthAction) => void
}

/** Whether this endpoint is delivering, in one sentence, with the step that fits it. */
export function EndpointHealth(props: EndpointHealthProps): JSX.Element {
  if (isTestShown(props.test)) {
    return <TestResultStrip test={props.test} />
  }

  return <DeliveryHealth {...props} />
}

function DeliveryHealth(props: EndpointHealthProps): JSX.Element {
  const deliveries = useWebhookDeliveriesQuery(props.projectId, props.endpoint.id)

  if (deliveries.data === undefined && deliveries.isError) {
    return <LoadError error={deliveries.error} onRetry={() => deliveries.refetch()} />
  }

  if (deliveries.data === undefined) {
    return <Skeleton className="h-12 rounded-xl" />
  }

  const loadedAt = deliveries.dataUpdatedAt
  const summary = summarizeDeliveries(deliveries.data, loadedAt)
  const kind = healthKindOf(props.endpoint, summary)
  const health = HEALTH[kind]
  const context = { now: loadedAt, failingSince: props.endpoint.failing_since ?? null }

  return (
    <SummarySentence
      tone={health.tone}
      verdict={health.verdict}
      action={<HealthStep step={health.action} onAction={props.onAction} />}
    >
      <span className="tabular-nums">{healthSentence(kind, summary, context)}</span>
    </SummarySentence>
  )
}

type HealthStepProps = {
  step: EndpointHealthState['action']
  onAction: (action: HealthAction) => void
}

function HealthStep({ step, onAction }: HealthStepProps): JSX.Element | null {
  if (step === null) {
    return null
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={() => onAction(step.kind)}>
      {step.label}
    </Button>
  )
}
