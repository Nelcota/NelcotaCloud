import type { JSX } from 'react'

import { AuditEventFacts } from '@/modules/activity/components/audit-event-facts'
import { detailsJson } from '@/modules/activity/components/audit-event-details'
import { actionText } from '@/modules/activity/components/audit-event-text'
import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime } from '@/shared/lib/format-date'
import { CodeBlock } from '@/shared/ui/code-block'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/primitives/sheet'

type AuditEvent = components['schemas']['AuditEvent']

export type AddressActions = {
  onFilter: (address: string) => void
  /** Absent on a user's page, where blocking is left to the project's activity page. */
  onBlock?: (address: string) => void
}

type AuditEventSheetProps = {
  /** The event open in the panel; `null` closes it. */
  event: AuditEvent | null
  context: AuditRowContext
  actions: AddressActions & { onClose: () => void }
}

/** One event beside the log: every field, its details and the raw JSON the API returned. */
export function AuditEventSheet({ event, context, actions }: AuditEventSheetProps): JSX.Element {
  return (
    <Sheet
      open={event !== null}
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          actions.onClose()
        }
      }}
    >
      <SheetContent className="sm:max-w-xl">
        <OpenEvent event={event} context={context} actions={actions} />
      </SheetContent>
    </Sheet>
  )
}

function OpenEvent({ event, context, actions }: AuditEventSheetProps): JSX.Element | null {
  if (event === null) {
    return null
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{actionText(event)}</SheetTitle>
        <SheetDescription className="tabular-nums">
          {formatDateTime(event.occurred_at)}
        </SheetDescription>
      </SheetHeader>
      <SheetBody>
        <AuditEventFacts event={event} context={context} actions={actions} />
        <EventDetails event={event} />
        <CodeBlock
          code={JSON.stringify(event, null, 2)}
          language="json"
          title="evento.json"
          copyLabel="evento em JSON"
          maxHeight={320}
        />
      </SheetBody>
    </>
  )
}

function EventDetails({ event }: { event: AuditEvent }): JSX.Element | null {
  const json = detailsJson(event)

  if (json === null) {
    return null
  }

  return (
    <CodeBlock
      code={json}
      title="details"
      language="json"
      copyLabel="detalhes do evento"
      isWrapped
    />
  )
}
