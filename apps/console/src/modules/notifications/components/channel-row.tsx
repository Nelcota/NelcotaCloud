import Pen from '~icons/solar/pen-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import type { NotificationChannel } from '@/modules/notifications/api/list-channels'
import { ChannelKindIcon } from '@/modules/notifications/components/channel-kind-icon'
import { EditEventsDialog } from '@/modules/notifications/components/edit-events-dialog'
import { TestChannelButton } from '@/modules/notifications/components/test-channel-button'
import { KIND_LABELS, eventLabel } from '@/modules/notifications/model/notification-events'
import { useDeleteChannelMutation } from '@/modules/notifications/queries/use-notification-channels'
import { useReadOnlyReason } from '@/shared/auth/write-access'
import { Button } from '@/shared/ui/button'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type ChannelRowProps = { projectId: string; channel: NotificationChannel }

/** One channel: where it goes, what it hears about, and its actions. */
export function ChannelRow({ projectId, channel }: ChannelRowProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false)
  const deletion = useDeleteChannelMutation(projectId)
  const readOnlyReason = useReadOnlyReason()

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <ChannelKindIcon kind={channel.kind} />
      <div className="grid min-w-0 flex-1 basis-56 gap-0.5">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-sm break-all">{channel.target_hint}</span>
          <span className="text-muted-foreground text-xs">{KIND_LABELS[channel.kind]}</span>
        </span>
        <span className="text-muted-foreground text-xs text-pretty">
          {channel.events.map(eventLabel).join(' · ')}
        </span>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1">
        <TestChannelButton projectId={projectId} channelId={channel.id} />
        <Button
          size="sm"
          variant="ghost"
          disabled={readOnlyReason !== null}
          title={readOnlyReason ?? undefined}
          onClick={() => setIsEditing(true)}
        >
          <Pen aria-hidden="true" />
          Avisos
        </Button>
        <ConfirmButton
          isDestructive
          title={`Remover o canal ${channel.target_hint}?`}
          description={`${channel.target_hint} deixa de receber os avisos do projeto.`}
          confirmLabel="Remover canal"
          isPending={deletion.isPending}
          onConfirm={() => deletion.mutateAsync(channel.id)}
        >
          Remover
        </ConfirmButton>
      </div>
      <EditDialog
        isShown={isEditing}
        projectId={projectId}
        channel={channel}
        onClose={() => setIsEditing(false)}
      />
    </li>
  )
}

type EditDialogProps = {
  isShown: boolean
  projectId: string
  channel: NotificationChannel
  onClose: () => void
}

function EditDialog({ isShown, ...props }: EditDialogProps): JSX.Element | null {
  if (isShown === false) {
    return null
  }

  return <EditEventsDialog {...props} />
}
