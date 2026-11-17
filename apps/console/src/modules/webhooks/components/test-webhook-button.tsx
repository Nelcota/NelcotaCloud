import type { JSX } from 'react'

import { useTestWebhookMutation } from '@/modules/webhooks/queries/use-webhook-deliveries'
import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'

type TestDeliveryResult = components['schemas']['TestDeliveryResult']

type TestWebhookButtonProps = { projectId: string; endpointId: string }

/** Sends a signed `webhook.test` event now and shows what the receiver answered. */
export function TestWebhookButton({ projectId, endpointId }: TestWebhookButtonProps): JSX.Element {
  const test = useTestWebhookMutation(projectId)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={test.isPending}
        aria-busy={test.isPending}
        onClick={() => test.mutate(endpointId)}
      >
        Enviar evento de teste
      </Button>
      <TestResult result={test.data} />
      <ErrorAlert error={test.error} />
    </div>
  )
}

function TestResult({ result }: { result: TestDeliveryResult | undefined }): JSX.Element | null {
  if (result === undefined) {
    return null
  }

  if (result.delivered) {
    return (
      <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
        Recebido (HTTP {result.response_status})
      </p>
    )
  }

  return (
    <p role="status" className="text-destructive text-sm break-words">
      Não recebido: {result.error ?? 'sem resposta'}
    </p>
  )
}
