import Letter from '~icons/solar/letter-linear'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { formatDate } from '@/shared/lib/format-date'
import { Button } from '@/shared/ui/button'

type ReceivedInvitation = components['schemas']['ReceivedInvitation']

type InvitationCardProps = {
  invitation: ReceivedInvitation
  isPending: boolean
  onAccept: () => void
  onDecline: () => void
}

export function InvitationCard(props: InvitationCardProps): JSX.Element {
  const { invitation } = props

  return (
    <article className="bg-card flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
      <span className="bg-secondary flex size-11 shrink-0 items-center justify-center rounded-lg">
        <Letter className="text-muted-foreground size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold">Você foi convidado para {invitation.project_name}</h2>
        <p className="text-muted-foreground text-sm">
          Convite de {formatDate(invitation.created_at)}. Ao aceitar, você entra como membro.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" disabled={props.isPending} onClick={props.onDecline}>
          Recusar
        </Button>
        <Button disabled={props.isPending} aria-busy={props.isPending} onClick={props.onAccept}>
          Aceitar convite
        </Button>
      </div>
    </article>
  )
}
