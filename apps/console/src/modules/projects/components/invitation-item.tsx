import { Mail as Letter, X, Check } from 'lucide-react'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { formatDate } from '@/shared/lib/format-date'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { PendingButton } from '@/shared/ui/pending-button'

type ReceivedInvitation = components['schemas']['ReceivedInvitation']

type InvitationItemProps = {
  invitation: ReceivedInvitation
  isPending: boolean
  onAccept: () => void
  onDecline: () => Promise<void>
}

/** An invitation to someone else's project, as a row with its answer. */
export function InvitationItem(props: InvitationItemProps): JSX.Element {
  const { invitation, isPending } = props

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-hover text-muted-foreground">
        <Letter aria-hidden className="size-5" />
      </span>
      <div className="grid min-w-0 flex-1 basis-56 gap-0.5">
        <p className="truncate text-sm font-medium text-heading">{invitation.project_name}</p>
        <p className="text-xs text-muted-foreground">
          Como membro · {formatDate(invitation.created_at)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ConfirmButton
          label="Recusar"
          icon={X}
          isDisabled={isPending}
          title={`Recusar o convite para ${invitation.project_name}?`}
          description="O convite deixa de valer. Para entrar depois, um dono precisa convidar você de novo."
          confirmLabel="Recusar convite"
          onConfirm={props.onDecline}
        />
        <PendingButton type="button" size="sm" isPending={isPending} onClick={props.onAccept}>
          <Check aria-hidden data-icon="inline-start" />
          Aceitar
        </PendingButton>
      </div>
    </li>
  )
}
