import type { JSX } from 'react'

import { EventDetailFields } from '@/modules/activity/components/event-detail-fields'
import { EventUserActions } from '@/modules/activity/components/event-user-actions'
import { BlockAddressButton } from '@/modules/project-settings/ip-blocks/components/block-address-button'
import { actionText } from '@/modules/activity/components/audit-labels'
import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime } from '@/shared/lib/format-date'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'

type AuditEvent = components['schemas']['AuditEvent']

type EventDetailSheetProps = {
  /** `null` keeps the panel closed. */
  event: AuditEvent | null
  context: AuditRowContext
  onClose: () => void
}

/** Everything the log knows about one event, and what to do about its user. */
export function EventDetailSheet({ event, context, onClose }: EventDetailSheetProps): JSX.Element {
  return (
    <Sheet open={event !== null} onOpenChange={(open) => closeWhenDismissed(open, onClose)}>
      <SheetContent className="gap-0 overflow-y-auto data-[side=right]:sm:max-w-md">
        <EventDetailBody event={event} context={context} />
      </SheetContent>
    </Sheet>
  )
}

function closeWhenDismissed(open: boolean, onClose: () => void): void {
  if (open) {
    return
  }

  onClose()
}

function EventDetailBody(props: {
  event: AuditEvent | null
  context: AuditRowContext
}): JSX.Element | null {
  const event = props.event

  if (event === null) {
    return null
  }

  return (
    <>
      <SheetHeader className="pr-12">
        <SheetTitle className="text-lg font-semibold">{actionText(event)}</SheetTitle>
        <SheetDescription>
          <time dateTime={event.occurred_at}>{formatDateTime(event.occurred_at)}</time>
        </SheetDescription>
      </SheetHeader>
      <div className="grid gap-6 px-4 pb-6">
        <EventDetailFields event={event} context={props.context} />
        <EventUserActions event={event} projectId={props.context.projectId} />
        <EventAddressAction event={event} projectId={props.context.projectId} />
      </div>
    </>
  )
}

type EventAddressActionProps = { event: AuditEvent; projectId: string }

/** Blocks the address an event came from; the admin's own requests are left out. */
function EventAddressAction({ event, projectId }: EventAddressActionProps): JSX.Element | null {
  const address = event.ip_address ?? null

  if (address === null || event.actor !== 'user') {
    return null
  }

  return (
    <div>
      <BlockAddressButton projectId={projectId} address={address} />
    </div>
  )
}
