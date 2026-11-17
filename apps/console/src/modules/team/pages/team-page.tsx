import type { JSX } from 'react'

import { InviteDialog } from '@/modules/team/components/invite-dialog'
import { TeamBrowser } from '@/modules/team/components/team-browser'
import { useTeamQuery } from '@/modules/team/queries/use-team'
import type { components } from '@/shared/api/api-schema'
import { showFlash } from '@/shared/lib/flash-notice'
import { useProjectId } from '@/shared/routing/use-project-id'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'

type TeamView = components['schemas']['TeamView']

const SKELETON_ROWS = ['a', 'b']

export function TeamPage(): JSX.Element {
  const projectId = useProjectId()
  const team = useTeamQuery(projectId)

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Equipe"
        description="As pessoas que gerenciam este projeto no console."
        actions={<InviteAction team={team.data} projectId={projectId} />}
      />
      <LoadError error={team.error} onRetry={() => team.refetch()} />
      <TeamContent projectId={projectId} team={team.data} hasFailed={team.isError} />
    </div>
  )
}

/** Only owners invite; members see the team without the button. */
function InviteAction({
  team,
  projectId,
}: {
  team: TeamView | undefined
  projectId: string
}): JSX.Element | null {
  if (team?.can_manage !== true) {
    return null
  }

  return (
    <InviteDialog
      projectId={projectId}
      onInvited={(email) => showFlash(`Convite enviado para ${email}.`)}
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

/** Shaped like the table it stands for, header row included, so nothing jumps on load. */
function TeamSkeleton(): JSX.Element {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando equipe"
      className="grid gap-px overflow-hidden rounded-xl border"
    >
      <div className="bg-foreground/10 h-12" />
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="bg-card flex items-center gap-4 px-5 py-4">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-5 w-56" />
          <Skeleton className="ml-auto size-10 rounded-md" />
        </div>
      ))}
    </div>
  )
}
