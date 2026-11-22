import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'

import { InvitationItem } from '@/modules/projects/components/invitation-item'
import {
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
  useReceivedInvitationsQuery,
} from '@/modules/projects/queries/use-received-invitations'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { LoadError } from '@/shared/ui/load-error'
import { Section } from '@/shared/ui/section'

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

  if (received.length === 0 && invitations.error === null) {
    return null
  }

  return (
    <div className="grid gap-3">
      <LoadError error={invitations.error} onRetry={() => void invitations.refetch()} />
      <ErrorAlert error={acceptance.error ?? refusal.error} />
      {received.length > 0 && (
        <Section title="Convites recebidos" meta={received.length} isFramed>
          <ul className="divide-y">
            {received.map((invitation) => (
              <InvitationItem
                key={invitation.id}
                invitation={invitation}
                isPending={isAnswering(invitation.id, [acceptance, refusal])}
                onAccept={() => accept(invitation.id)}
                onDecline={() => refusal.mutate(invitation.id)}
              />
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

type Answering = { isPending: boolean; variables: string | undefined }

function isAnswering(invitationId: string, mutations: Answering[]): boolean {
  return mutations.some((mutation) => mutation.isPending && mutation.variables === invitationId)
}
