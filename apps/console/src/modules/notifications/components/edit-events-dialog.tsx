import type { JSX } from 'react'
import { useState } from 'react'

import type { NotificationChannel } from '@/modules/notifications/api/list-channels'
import { EventsField } from '@/modules/notifications/components/events-field'
import type { NotificationEvent } from '@/modules/notifications/components/notification-events'
import { useChangeChannelMutation } from '@/modules/notifications/queries/use-notification-channels'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

type EditEventsDialogProps = {
  projectId: string
  channel: NotificationChannel
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

/** Changes which alerts one channel receives. */
export function EditEventsDialog(props: EditEventsDialogProps): JSX.Element {
  const { projectId, channel } = props
  const [events, setEvents] = useState<NotificationEvent[]>(channel.events)
  const [wasOpen, setWasOpen] = useState(props.isOpen)

  // Each opening starts from the saved events: a choice cancelled last time never comes back.
  if (props.isOpen !== wasOpen) {
    setWasOpen(props.isOpen)
    setEvents(channel.events)
  }

  const change = useChangeChannelMutation(projectId)

  async function save(): Promise<void> {
    await change.mutateAsync({ channelId: channel.id, events })
  }

  return (
    <ConfirmDialog
      isOpen={props.isOpen}
      onOpenChange={props.onOpenChange}
      title="Avisos do canal"
      description={channel.target_hint}
      confirmLabel="Salvar"
      canConfirm={events.length > 0}
      onConfirm={save}
    >
      <EventsField selected={events} onChange={setEvents} />
    </ConfirmDialog>
  )
}
