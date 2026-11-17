import { Link } from '@tanstack/react-router'
import Plus from '~icons/solar/add-linear'
import type { JSX } from 'react'

import { ProjectList } from '@/modules/projects/components/project-list'
import { useProjectsQuery } from '@/modules/projects/queries/use-projects'
import { ReceivedInvitations } from '@/modules/projects/components/received-invitations'
import type { components } from '@/shared/api/api-schema'
import { buttonVariants } from '@/shared/ui/button-variants'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'

type ProjectSummary = components['schemas']['ProjectSummary']

const SKELETON_ROWS = ['a', 'b', 'c']

export function ProjectsPage(): JSX.Element {
  const projects = useProjectsQuery()

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Projetos"
        description="Cada projeto é o Auth de um app: usuários, chaves e login social próprios."
        actions={
          <Link to="/projects/new" className={buttonVariants()}>
            <Plus />
            Novo projeto
          </Link>
        }
      />
      <ErrorAlert error={projects.error} />
      <ReceivedInvitations />
      <ProjectsContent isPending={projects.isPending} projects={projects.data} />
    </div>
  )
}

type ProjectsContentProps = {
  isPending: boolean
  projects: ProjectSummary[] | undefined
}

function ProjectsContent({ isPending, projects }: ProjectsContentProps): JSX.Element | null {
  if (isPending) {
    return (
      <div
        aria-busy="true"
        aria-label="Carregando projetos"
        className="grid gap-px overflow-hidden rounded-xl border"
      >
        {SKELETON_ROWS.map((row) => (
          <div key={row} className="bg-card flex items-center gap-4 px-5 py-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    )
  }

  if (projects === undefined) {
    return null
  }

  return <ProjectList projects={projects} />
}
