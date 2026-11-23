import type { JSX } from 'react'
import { useState } from 'react'

import type { NotificationChannel } from '@/modules/notifications/api/list-channels'
import { EventsField } from '@/modules/notifications/components/events-field'
import type { NotificationEvent } from '@/modules/notifications/components/notification-events'
import { useChangeChannelMutation } from '@/modules/notifications/queries/use-notification-channels'
import { missingUnless } from '@/shared/lib/missing-unless'
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

  if (props.isOpen !== wasOpen) {
    setWasOpen(props.isOpen)
  }

  // Each opening starts from the saved events: a choice cancelled last time never comes back.
  // Closing keeps them, so the boxes do not flip while the dialog fades out.
  if (props.isOpen && wasOpen === false) {
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
      missing={missingUnless(events.length > 0, 'Escolha pelo menos um aviso')}
      onConfirm={save}
    >
      <EventsField selected={events} onChange={setEvents} />
    </ConfirmDialog>
  )
}
