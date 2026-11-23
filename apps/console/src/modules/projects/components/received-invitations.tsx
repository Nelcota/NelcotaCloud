import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'

import {
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
  useReceivedInvitationsQuery,
} from '@/modules/projects/queries/use-received-invitations'
import { InvitationCard } from '@/modules/projects/components/invitation-card'
import { ErrorAlert } from '@/shared/ui/error-alert'

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
      <ErrorAlert error={acceptance.error} />
      {received.map((invitation) => (
        <InvitationCard
          key={invitation.id}
          invitation={invitation}
          isPending={isAnswering(invitation.id, [acceptance, refusal])}
          onAccept={() => accept(invitation.id)}
          onDecline={() => refusal.mutateAsync(invitation.id)}
        />
      ))}
    </section>
  )
}

type Answering = { isPending: boolean; variables: string | undefined }

function isAnswering(invitationId: string, mutations: Answering[]): boolean {
  return mutations.some((mutation) => mutation.isPending && mutation.variables === invitationId)
}
