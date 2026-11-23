import { Mail, MessageSquare, Trash2 as Trash, Pencil } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import type { NotificationChannel } from '@/modules/notifications/api/list-channels'
import { EditEventsDialog } from '@/modules/notifications/components/edit-events-dialog'
import { KIND_LABELS, eventLabel } from '@/modules/notifications/components/notification-events'
import { TestChannelButton } from '@/modules/notifications/components/test-channel-button'
import { useDeleteChannelMutation } from '@/modules/notifications/queries/use-notification-channels'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import type { IconComponent } from '@/shared/ui/icon-component'
import { Button } from '@/shared/ui/primitives/button'

const KIND_ICONS: Record<NotificationChannel['kind'], IconComponent> = {
  email: Mail,
  discord: MessageSquare,
  slack: MessageSquare,
}

type ChannelRowProps = { projectId: string; channel: NotificationChannel }

/** One channel: where it goes, what it hears about, and its actions. */
export function ChannelRow({ projectId, channel }: ChannelRowProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false)
  const deletion = useDeleteChannelMutation(projectId)
  const Glyph = KIND_ICONS[channel.kind]

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <Glyph aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-sm break-all text-heading">{channel.target_hint}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {KIND_LABELS[channel.kind]}
          </span>
        </span>
        <span className="text-xs text-pretty text-muted-foreground">
          {channel.events.map(eventLabel).join(' · ')}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <TestChannelButton projectId={projectId} channelId={channel.id} />
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          <Pencil aria-hidden data-icon="inline-start" />
          Editar avisos
        </Button>
        <ConfirmButton
          label="Remover canal"
          icon={Trash}
          isIconOnly
          isDestructive
          title={`Remover o canal ${channel.target_hint}?`}
          description={`${channel.target_hint} deixa de receber os avisos do projeto.`}
          confirmLabel="Remover canal"
          onConfirm={() => deletion.mutateAsync(channel.id)}
        />
      </div>
      <EditEventsDialog
        projectId={projectId}
        channel={channel}
        isOpen={isEditing}
        onOpenChange={setIsEditing}
      />
    </li>
  )
}
