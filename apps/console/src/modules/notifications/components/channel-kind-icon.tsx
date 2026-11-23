import Letter from '~icons/solar/letter-linear'
import DiscordLogo from '~icons/logos/discord-icon'
import SlackLogo from '~icons/logos/slack-icon'
import type { JSX } from 'react'

import type { ChannelKind } from '@/modules/notifications/model/notification-events'

/** Chat services by their own mark; email by the console's letter icon. */
export function ChannelKindIcon({ kind }: { kind: ChannelKind }): JSX.Element {
  if (kind === 'discord') {
    return <DiscordLogo aria-hidden="true" className="size-5 shrink-0" />
  }

  if (kind === 'slack') {
    return <SlackLogo aria-hidden="true" className="size-5 shrink-0" />
  }

  return <Letter aria-hidden="true" className="text-muted-foreground size-5 shrink-0" />
}
