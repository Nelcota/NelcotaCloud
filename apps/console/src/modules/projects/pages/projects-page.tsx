import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import type { JSX } from 'react'

import { ProjectList } from '@/modules/projects/components/project-list'
import { useProjectsQuery } from '@/modules/projects/queries/use-projects'
import type { components } from '@/shared/api/api-schema'
import { buttonVariants } from '@/shared/ui/button-variants'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'

type ProjectSummary = components['schemas']['ProjectSummary']

const SKELETON_CARDS = ['a', 'b', 'c']

export function ProjectsPage(): JSX.Element {
  const projects = useProjectsQuery()

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Projetos"
        description="Cada projeto é o Auth de um app: usuários, chaves e login social próprios."
        actions={
          <Link to="/projects/new" className={buttonVariants()}>
            <Plus strokeWidth={2} />
            Novo projeto
          </Link>
        }
      />
      <ErrorAlert error={projects.error} />
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
      <ul
        aria-busy="true"
        aria-label="Carregando projetos"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {SKELETON_CARDS.map((card) => (
          <li key={card}>
            <Skeleton className="h-44 rounded-xl" />
          </li>
        ))}
      </ul>
    )
  }

  if (projects === undefined) {
    return null
  }

  return <ProjectList projects={projects} />
}
