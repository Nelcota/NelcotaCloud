import type { JSX } from 'react'

import { NewProjectButton } from '@/modules/projects/components/new-project-button'
import { ProjectList } from '@/modules/projects/components/project-list'
import { ProjectsSkeleton } from '@/modules/projects/components/projects-skeleton'
import { ReceivedInvitations } from '@/modules/projects/components/received-invitations'
import { useProjectsQuery } from '@/modules/projects/queries/use-projects'
import type { components } from '@/shared/api/api-schema'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'

type ProjectSummary = components['schemas']['ProjectSummary']

export function ProjectsPage(): JSX.Element {
  const projects = useProjectsQuery()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Projetos"
        description="Cada projeto tem seu próprio Auth, banco Postgres e chaves de API."
        actions={<NewProjectButton />}
      />
      <LoadError error={projects.error} onRetry={() => projects.refetch()} />
      <ReceivedInvitations />
      <ProjectsContent isPending={projects.isPending} projects={projects.data} />
    </div>
  )
}

function ProjectsContent({
  isPending,
  projects,
}: {
  isPending: boolean
  projects: ProjectSummary[] | undefined
}): JSX.Element | null {
  if (isPending) {
    return <ProjectsSkeleton />
  }

  if (projects === undefined) {
    return null
  }

  return <ProjectList projects={projects} />
}
