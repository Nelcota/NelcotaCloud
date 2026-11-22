import { Mail as Letter } from 'lucide-react'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { formatDate } from '@/shared/lib/format-date'
import { PendingButton } from '@/shared/ui/pending-button'
import { Button } from '@/shared/ui/primitives/button'

type ReceivedInvitation = components['schemas']['ReceivedInvitation']

type InvitationItemProps = {
  invitation: ReceivedInvitation
  isPending: boolean
  onAccept: () => void
  onDecline: () => void
}

/** An invitation to someone else's project, as a row with its answer. */
export function InvitationItem(props: InvitationItemProps): JSX.Element {
  const { invitation, isPending } = props

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-hover text-muted-foreground">
        <Letter aria-hidden className="size-4" />
      </span>
      <div className="grid min-w-0 flex-1 basis-56 gap-0.5">
        <p className="truncate text-sm font-medium text-heading">{invitation.project_name}</p>
        <p className="text-xs text-muted-foreground">
          Como membro · {formatDate(invitation.created_at)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={props.onDecline}
        >
          Recusar
        </Button>
        <PendingButton type="button" size="sm" isPending={isPending} onClick={props.onAccept}>
          Aceitar
        </PendingButton>
      </div>
    </li>
  )
}
