import type { JSX } from 'react'

import type { NotificationChannel } from '@/modules/notifications/api/list-channels'
import { AddChannelDialog } from '@/modules/notifications/components/add-channel-dialog'
import { ChannelRow } from '@/modules/notifications/components/channel-row'
import { MAX_CHANNELS } from '@/modules/notifications/model/notification-events'
import { useChannelsQuery } from '@/modules/notifications/queries/use-notification-channels'
import { LoadError } from '@/shared/ui/load-error'
import { SettingsSection } from '@/shared/ui/settings-section'
import { Skeleton } from '@/shared/ui/skeleton'

/** Where the project's alerts go: emails and chat webhooks, each with the events it hears. */
export function NotificationsSection({ projectId }: { projectId: string }): JSX.Element {
  const channels = useChannelsQuery(projectId)
  const count = channels.data?.length ?? 0

  return (
    <SettingsSection
      title="Notificações"
      description="Webhooks falhando, logins recusados, erros na Data API e armazenamento quase cheio, por email, Discord ou Slack."
      footer={
        <>
          <span className="text-muted-foreground mr-auto text-sm">
            {count} de {MAX_CHANNELS} canais
          </span>
          <AddChannelDialog projectId={projectId} isFull={count >= MAX_CHANNELS} />
        </>
      }
    >
      <LoadError error={channels.error} onRetry={() => channels.refetch()} />
      <ChannelList projectId={projectId} channels={channels.data} />
    </SettingsSection>
  )
}

type ChannelListProps = { projectId: string; channels: NotificationChannel[] | undefined }

function ChannelList({ projectId, channels }: ChannelListProps): JSX.Element {
  if (channels === undefined) {
    return <Skeleton aria-label="Carregando canais" className="h-16 rounded-lg" />
  }

  if (channels.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-pretty">
        Nenhum canal. Sem canais, só os donos recebem por email os avisos de webhooks falhando.
      </p>
    )
  }

  return (
    <ul className="divide-border divide-y rounded-lg border">
      {channels.map((channel) => (
        <ChannelRow key={channel.id} projectId={projectId} channel={channel} />
      ))}
    </ul>
  )
}
