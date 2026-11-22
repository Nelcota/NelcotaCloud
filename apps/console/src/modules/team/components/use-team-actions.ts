import { useNavigate } from '@tanstack/react-router'

import { useCurrentProject } from '@/modules/projects/queries/use-projects'
import type { ActionTarget } from '@/modules/team/components/action-target'
import { invitationDeliveryMessage } from '@/modules/team/components/invitation-delivery-copy'
import { doneFor } from '@/modules/team/components/team-action-copy'
import type { MemberAction } from '@/modules/team/components/team-row-actions'
import type { InvitationRow, MemberRow } from '@/modules/team/components/team-rows'
import {
  useCancelInvitationMutation,
  useChangeRoleMutation,
  useLeaveProjectMutation,
  useRemoveMemberMutation,
  useResendInvitationMutation,
  useTransferOwnershipMutation,
} from '@/modules/team/queries/use-team'
import { type Flash, showFlash } from '@/shared/lib/flash-notice'

export type TeamActions = {
  /** Settles when the API answers, so the confirmation can wait and show a failure. */
  runMember: (target: ActionTarget, action: MemberAction) => Promise<void>
  cancelInvitation: (invitation: InvitationRow) => Promise<void>
  resendInvitation: (invitation: InvitationRow) => Promise<void>
}

/** Every action of the team page, each saying it worked once the API agrees. */
export function useTeamActions(projectId: string): TeamActions {
  const navigate = useNavigate()
  const projectName = useCurrentProject(projectId)?.name
  const roleChange = useChangeRoleMutation(projectId)
  const transfer = useTransferOwnershipMutation(projectId)
  const removal = useRemoveMemberMutation(projectId)
  const cancellation = useCancelInvitationMutation(projectId)
  const resending = useResendInvitationMutation(projectId)
  const leaving = useLeaveProjectMutation(projectId)
  const runners: Record<MemberAction, (row: MemberRow) => Promise<unknown>> = {
    promote: (row) => roleChange.mutateAsync({ accountId: row.id, role: 'owner' }),
    demote: (row) => roleChange.mutateAsync({ accountId: row.id, role: 'member' }),
    transfer: (row) => transfer.mutateAsync(row.id),
    remove: (row) => removal.mutateAsync(row.id),
    leave: () => leaving.mutateAsync(),
  }

  async function runMember(target: ActionTarget, action: MemberAction): Promise<void> {
    await runners[action](target.row)

    if (action === 'leave') {
      showFlash(leftMessage(projectName))
      await navigate({ to: '/' })
      return
    }

    showFlash(doneFor(action, target.name, target.isOwnRow), linkAfter(action, projectId))
  }

  async function cancelInvitation(invitation: InvitationRow): Promise<void> {
    await cancellation.mutateAsync(invitation.id)
    showFlash(`Convite para ${invitation.email} cancelado.`)
  }

  async function resendInvitation(invitation: InvitationRow): Promise<void> {
    const result = await resending.mutateAsync(invitation.id)
    showFlash(invitationDeliveryMessage(result))
  }

  return { runMember, cancelInvitation, resendInvitation }
}

function leftMessage(projectName: string | undefined): string {
  if (projectName === undefined) {
    return 'Você saiu do projeto.'
  }

  return `Você saiu de ${projectName}.`
}

/** Removing someone leaves the keys they copied valid, so the notice points to revoking them. */
function linkAfter(action: MemberAction, projectId: string): Flash['link'] {
  if (action !== 'remove') {
    return undefined
  }

  return { label: 'Revisar chaves de API', href: `/projects/${projectId}/keys` }
}
