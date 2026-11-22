import type { JSX } from 'react'

import { invitationDeliveryMessage } from '@/modules/team/components/invitation-delivery-copy'
import { InviteDialog } from '@/modules/team/components/invite-dialog'
import { teamApiSnippets } from '@/modules/team/components/team-api-snippets'
import { TeamBrowser } from '@/modules/team/components/team-browser'
import { TeamFacts } from '@/modules/team/components/team-facts'
import { TeamSkeleton } from '@/modules/team/components/team-skeleton'
import { useTeamQuery } from '@/modules/team/queries/use-team'
import type { components } from '@/shared/api/api-schema'
import { showFlash } from '@/shared/lib/flash-notice'
import { useProjectId } from '@/shared/routing/use-project-id'
import { ApiSheet } from '@/shared/ui/api-sheet'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'

type TeamView = components['schemas']['TeamView']

export function TeamPage(): JSX.Element {
  const projectId = useProjectId()
  const team = useTeamQuery(projectId)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Equipe"
        description={<TeamCount team={team.data} />}
        actions={
          <>
            <ApiSheet title="Equipe pela API" snippets={teamApiSnippets(projectId)} />
            <InviteAction projectId={projectId} team={team.data} />
          </>
        }
      >
        <TeamFacts projectId={projectId} />
      </PageHeader>
      <LoadError error={team.error} onRetry={() => team.refetch()} />
      <TeamContent projectId={projectId} team={team.data} hasFailed={team.isError} />
    </div>
  )
}

function TeamCount({ team }: { team: TeamView | undefined }): JSX.Element {
  if (team === undefined) {
    return <span>Quem gerencia este projeto no console.</span>
  }

  return (
    <span className="tabular-nums">
      {peopleLabel(team.members.length)} com acesso · {invitationsLabel(team.invitations.length)}
    </span>
  )
}

function peopleLabel(count: number): string {
  if (count === 1) {
    return '1 pessoa'
  }

  return `${count} pessoas`
}

function invitationsLabel(count: number): string {
  if (count === 1) {
    return '1 convite pendente'
  }

  return `${count} convites pendentes`
}

/** Only owners invite; members see the team without the button. */
function InviteAction(props: {
  projectId: string
  team: TeamView | undefined
}): JSX.Element | null {
  if (props.team === undefined || props.team.can_manage === false) {
    return null
  }

  return (
    <InviteDialog
      projectId={props.projectId}
      onInvited={(invitation) => showFlash(invitationDeliveryMessage(invitation))}
    />
  )
}

type TeamContentProps = {
  projectId: string
  team: TeamView | undefined
  hasFailed: boolean
}

function TeamContent({ projectId, team, hasFailed }: TeamContentProps): JSX.Element | null {
  if (team === undefined && hasFailed) {
    return null
  }

  if (team === undefined) {
    return <TeamSkeleton />
  }

  return <TeamBrowser projectId={projectId} team={team} />
}
