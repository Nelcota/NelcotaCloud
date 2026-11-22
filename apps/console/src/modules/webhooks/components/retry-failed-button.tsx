import { RotateCcw } from 'lucide-react'
import type { JSX } from 'react'

import { useRetryFailedDeliveriesMutation } from '@/modules/webhooks/queries/use-webhook-deliveries'
import { describeError } from '@/shared/api/describe-error'
import { showFlash } from '@/shared/lib/flash-notice'
import { formatCount } from '@/shared/lib/format-number'
import { PendingButton } from '@/shared/ui/pending-button'

type RetryFailedButtonProps = { projectId: string; endpointId: string }

/** Sends every failed delivery of the endpoint again, after the receiver was fixed. */
export function RetryFailedButton({ projectId, endpointId }: RetryFailedButtonProps): JSX.Element {
  const retry = useRetryFailedDeliveriesMutation(projectId)

  async function retryAll(): Promise<void> {
    const result = await retry.mutateAsync(endpointId)
    showFlash(queuedText(result.queued))
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <PendingButton
        type="button"
        size="sm"
        variant="outline"
        isPending={retry.isPending}
        onClick={() => void retryAll().catch(shownBelow)}
      >
        <RotateCcw aria-hidden data-icon="inline-start" />
        Reenviar falhas
      </PendingButton>
      <RetryError error={retry.error} />
    </div>
  )
}

function RetryError({ error }: { error: Error | null }): JSX.Element | null {
  if (error === null) {
    return null
  }

  return (
    <p role="alert" className="max-w-64 text-xs text-destructive">
      {describeError(error)}
    </p>
  )
}

function queuedText(queued: number): string {
  if (queued === 0) {
    return 'Nenhuma falha para reenviar.'
  }

  if (queued === 1) {
    return '1 entrega voltou para a fila.'
  }

  return `${formatCount(queued)} entregas voltaram para a fila.`
}

/** The mutation keeps the error, shown under the button. */
function shownBelow(): void {}
