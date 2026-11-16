import type { JSX } from 'react'

import { InviteForm } from '@/modules/team/components/invite-form'
import { PendingInvitationsList } from '@/modules/team/components/pending-invitations-list'
import { TeamMembersList } from '@/modules/team/components/team-members-list'
import { useTeamQuery } from '@/modules/team/queries/use-team'
import type { components } from '@/shared/api/api-schema'
import { useProjectId } from '@/shared/routing/use-project-id'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'

export function TeamPage(): JSX.Element {
  const projectId = useProjectId()
  const team = useTeamQuery(projectId)

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        title="Equipe"
        description="Quem gerencia este projeto no console. Só donos convidam e removem pessoas."
      />
      <ErrorAlert error={team.error} />
      <TeamContent projectId={projectId} team={team.data} hasFailed={team.isError} />
    </div>
  )
}

type TeamContentProps = {
  projectId: string
  team: components['schemas']['TeamView'] | undefined
  hasFailed: boolean
}

function TeamContent({ projectId, team, hasFailed }: TeamContentProps): JSX.Element | null {
  if (team === undefined && hasFailed) {
    return null
  }

  if (team === undefined) {
    return <Skeleton className="h-64 rounded-xl" />
  }

  return (
    <>
      <InviteSection projectId={projectId} canManage={team.can_manage} />
      <TeamMembersList projectId={projectId} members={team.members} canManage={team.can_manage} />
      <PendingInvitationsList
        projectId={projectId}
        invitations={team.invitations}
        canManage={team.can_manage}
      />
    </>
  )
}

function InviteSection(props: { projectId: string; canManage: boolean }): JSX.Element | null {
  if (props.canManage === false) {
    return null
  }

  return <InviteForm projectId={props.projectId} />
}
