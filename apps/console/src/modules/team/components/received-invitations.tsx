import { useNavigate } from '@tanstack/react-router'
import Letter from '~icons/solar/letter-linear'
import type { JSX } from 'react'

import {
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
  useReceivedInvitationsQuery,
} from '@/modules/team/queries/use-received-invitations'
import type { components } from '@/shared/api/api-schema'
import { formatDate } from '@/shared/lib/format-date'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'

type ReceivedInvitation = components['schemas']['ReceivedInvitation']

/** Invitations to other people's projects, answered right from the projects page. */
export function ReceivedInvitations(): JSX.Element | null {
  const invitations = useReceivedInvitationsQuery()
  const acceptance = useAcceptInvitationMutation()
  const refusal = useDeclineInvitationMutation()
  const navigate = useNavigate()
  const received = invitations.data ?? []

  function accept(invitationId: string): void {
    acceptance.mutate(invitationId, {
      onSuccess: (joined) =>
        navigate({ to: '/projects/$projectId', params: { projectId: joined.project_id } }),
    })
  }

  if (received.length === 0) {
    return null
  }

  return (
    <section aria-label="Convites recebidos" className="grid gap-3">
      <ErrorAlert error={acceptance.error ?? refusal.error} />
      {received.map((invitation) => (
        <InvitationCard
          key={invitation.id}
          invitation={invitation}
          isPending={isAnswering(invitation.id, [acceptance, refusal])}
          onAccept={() => accept(invitation.id)}
          onDecline={() => refusal.mutate(invitation.id)}
        />
      ))}
    </section>
  )
}

type Answering = { isPending: boolean; variables: string | undefined }

function isAnswering(invitationId: string, mutations: Answering[]): boolean {
  return mutations.some((mutation) => mutation.isPending && mutation.variables === invitationId)
}

type InvitationCardProps = {
  invitation: ReceivedInvitation
  isPending: boolean
  onAccept: () => void
  onDecline: () => void
}

function InvitationCard(props: InvitationCardProps): JSX.Element {
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
