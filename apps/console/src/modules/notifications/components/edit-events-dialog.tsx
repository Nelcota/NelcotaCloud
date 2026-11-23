import type { JSX } from 'react'
import { useState } from 'react'

import type { NotificationChannel } from '@/modules/notifications/api/list-channels'
import { EventsField } from '@/modules/notifications/components/events-field'
import {
  type NotificationEvent,
  eventsMissing,
} from '@/modules/notifications/model/notification-events'
import { useChangeChannelMutation } from '@/modules/notifications/queries/use-notification-channels'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

type EditEventsDialogProps = {
  projectId: string
  channel: NotificationChannel
  onClose: () => void
}

/** Changes which alerts one channel receives; mounted per opening, so it starts from the saved ones. */
export function EditEventsDialog({
  projectId,
  channel,
  onClose,
}: EditEventsDialogProps): JSX.Element {
  const [events, setEvents] = useState<NotificationEvent[]>(channel.events)
  const change = useChangeChannelMutation(projectId)

  async function save(): Promise<void> {
    await change.mutateAsync({ channelId: channel.id, events })
  }

  return (
    <ConfirmDialog
      isOpen
      onClose={onClose}
      title="Avisos do canal"
      description={channel.target_hint}
      confirmLabel="Salvar"
      canConfirm={eventsMissing(events) === null}
      onConfirm={save}
    >
      <EventsField selected={events} onChange={setEvents} />
    </ConfirmDialog>
  )
}
