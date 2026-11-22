import type { JSX } from 'react'

import { DeliveryFields } from '@/modules/webhooks/components/delivery-fields'
import type { DeliveryRetry } from '@/modules/webhooks/components/delivery-retry'
import { DeliveryStatusBadge } from '@/modules/webhooks/components/delivery-status-badge'
import type { components } from '@/shared/api/api-schema'
import { CodeBlock } from '@/shared/ui/code-block'
import { PendingButton } from '@/shared/ui/pending-button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/primitives/sheet'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

type DeliverySheetProps = {
  /** The opened delivery; `undefined` keeps the sheet closed. */
  delivery: DeliveryLogEntry | undefined
  retry: DeliveryRetry
  onClose: () => void
}

/** Every field of one delivery, the headers that were sent, the raw record and resend. */
export function DeliverySheet({ delivery, retry, onClose }: DeliverySheetProps): JSX.Element {
  return (
    <Sheet
      open={delivery !== undefined}
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          onClose()
        }
      }}
    >
      <SheetContent
        side="right"
        className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <DeliveryContent delivery={delivery} retry={retry} />
      </SheetContent>
    </Sheet>
  )
}

type DeliveryContentProps = { delivery: DeliveryLogEntry | undefined; retry: DeliveryRetry }

function DeliveryContent({ delivery, retry }: DeliveryContentProps): JSX.Element | null {
  if (delivery === undefined) {
    return null
  }

  return (
    <>
      <SheetHeader className="gap-2 border-b px-6 py-5">
        <SheetTitle className="font-mono text-lg font-semibold text-heading">
          {delivery.event_type}
        </SheetTitle>
        <SheetDescription asChild>
          <div className="flex items-center gap-2">
            <DeliveryStatusBadge status={delivery.status} />
            <span>Eventos de teste não entram neste histórico.</span>
          </div>
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-6 p-6">
        <DeliveryFields delivery={delivery} />
        <CodeBlock code={sentHeaders(delivery)} title="Headers enviados" isWrapped />
        <p className="-mt-4 text-sm text-muted-foreground">
          O corpo não fica guardado: tem dados pessoais.
        </p>
        <CodeBlock code={JSON.stringify(delivery, null, 2)} title="JSON" copyLabel="Entrega" />
        <div className="flex justify-end">
          <PendingButton
            type="button"
            variant="outline"
            isPending={retry.retryingId === delivery.id}
            disabled={retry.retryingId !== null}
            onClick={() => retry.onRetry(delivery.id)}
          >
            Reenviar
          </PendingButton>
        </div>
      </div>
    </>
  )
}

/** The Standard Webhooks headers; `webhook-id` is the event id, the same on every retry. */
function sentHeaders(delivery: DeliveryLogEntry): string {
  return [
    'content-type: application/json',
    `webhook-id: ${delivery.event_id}`,
    'webhook-timestamp: <hora de cada tentativa, em segundos>',
    'webhook-signature: v1,<HMAC-SHA256 com o segredo>',
  ].join('\n')
}
