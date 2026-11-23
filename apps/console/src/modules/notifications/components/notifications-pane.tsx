import { BellRing } from 'lucide-react'
import type { JSX } from 'react'

import type { NotificationChannel } from '@/modules/notifications/api/list-channels'
import { AddChannelDialog } from '@/modules/notifications/components/add-channel-dialog'
import { ChannelRow } from '@/modules/notifications/components/channel-row'
import { useChannelsQuery } from '@/modules/notifications/queries/use-notification-channels'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { SettingsSection } from '@/shared/ui/settings-section'

/** The API refuses a sixth channel; the button stops before it. */
const MAX_CHANNELS = 5

/** Where the project's alerts go: emails and chat webhooks, each with the events it hears. */
export function NotificationsPane({ projectId }: { projectId: string }): JSX.Element {
  const channels = useChannelsQuery(projectId)
  const count = channels.data?.length ?? 0

  return (
    <SettingsSection
      title="Canais de notificação"
      description="Webhooks falhando, logins recusados, erros na Data API e armazenamento quase cheio."
      footerNote={`${count} de ${MAX_CHANNELS} canais`}
      footer={<AddChannelDialog projectId={projectId} isDisabled={count >= MAX_CHANNELS} />}
    >
      <LoadError error={channels.error} onRetry={() => channels.refetch()} />
      <ChannelsBody projectId={projectId} channels={channels.data} />
    </SettingsSection>
  )
}

type ChannelsBodyProps = { projectId: string; channels: NotificationChannel[] | undefined }

function ChannelsBody({ projectId, channels }: ChannelsBodyProps): JSX.Element {
  if (channels === undefined) {
    return <Skeleton className="h-16 rounded-lg" />
  }

  if (channels.length === 0) {
    return (
      <EmptyState
        isCompact
        icon={<BellRing aria-hidden />}
        title="Nenhum canal"
        description="Sem canais, só os donos recebem por email os avisos de webhook."
      />
    )
  }

  return (
    <ul className="-my-3 divide-y divide-divider">
      {channels.map((channel) => (
        <ChannelRow key={channel.id} projectId={projectId} channel={channel} />
      ))}
    </ul>
  )
}
