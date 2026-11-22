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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/primitives/sheet'
import { Timestamp } from '@/shared/ui/timestamp'

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
        className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
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
      <SheetHeader className="gap-1.5 border-b pe-12">
        <SheetTitle className="font-mono wrap-anywhere">{delivery.event_type}</SheetTitle>
        <SheetDescription asChild>
          <div className="flex flex-wrap items-center gap-2">
            <DeliveryStatusBadge status={delivery.status} />
            <span>
              Criada <Timestamp value={delivery.created_at} format="relative" />
            </span>
          </div>
        </SheetDescription>
      </SheetHeader>
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <DeliveryFields delivery={delivery} />
        <div className="grid gap-1.5">
          <CodeBlock code={sentHeaders(delivery)} title="Headers enviados" isWrapped />
          <p className="text-xs text-muted-foreground">
            O corpo não fica guardado: tem dados pessoais. Eventos de teste não entram neste
            histórico.
          </p>
        </div>
        <CodeBlock code={JSON.stringify(delivery, null, 2)} title="Registro" copyLabel="Entrega" />
      </div>
      <SheetFooter className="flex-row justify-end border-t">
        <PendingButton
          type="button"
          variant="outline"
          isPending={retry.retryingId === delivery.id}
          disabled={retry.retryingId !== null}
          onClick={() => retry.onRetry(delivery.id)}
        >
          Reenviar
        </PendingButton>
      </SheetFooter>
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
