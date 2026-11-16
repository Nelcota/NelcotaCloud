import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import type { JSX } from 'react'

import { ProjectList } from '@/modules/projects/components/project-list'
import { useProjectsQuery } from '@/modules/projects/queries/use-projects'
import type { components } from '@/shared/api/api-schema'
import { buttonVariants } from '@/shared/ui/button-variants'
import { ErrorAlert } from '@/shared/ui/error-alert'

type ProjectSummary = components['schemas']['ProjectSummary']

export function ProjectsPage(): JSX.Element {
  const projects = useProjectsQuery()

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground mt-1 text-sm">Escolha um projeto para gerenciar.</p>
        </div>
        <Link to="/projects/new" className={buttonVariants()}>
          <Plus className="size-4" strokeWidth={2} />
          Novo projeto
        </Link>
      </div>
      <ErrorAlert error={projects.error} />
      <ProjectsContent isPending={projects.isPending} projects={projects.data} />
    </section>
  )
}

type ProjectsContentProps = {
  isPending: boolean
  projects: ProjectSummary[] | undefined
}

function ProjectsContent({ isPending, projects }: ProjectsContentProps): JSX.Element | null {
  if (isPending) {
    return (
      <p aria-busy="true" className="text-muted-foreground text-sm">
        Carregando seus projetos…
      </p>
    )
  }

  if (projects === undefined) {
    return null
  }

  return <ProjectList projects={projects} />
}
