import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import { ProjectList } from '@/modules/projects/components/project-list'
import { useProjectsQuery } from '@/modules/projects/queries/use-projects'
import { ApiHealthCard } from '@/modules/system-status/components/api-health-card'
import { buttonVariants } from '@/shared/ui/button-variants'
import { ErrorAlert } from '@/shared/ui/error-alert'

export function ProjectsPage(): JSX.Element {
  const projects = useProjectsQuery()

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground text-sm">
            Cada projeto tem seus usuários, chaves e login.
          </p>
        </div>
        <Link to="/projects/new" className={buttonVariants()}>
          Novo projeto
        </Link>
      </div>
      <ErrorAlert error={projects.error} />
      <ProjectsContent isPending={projects.isPending} projects={projects.data} />
      <ApiHealthCard />
    </section>
  )
}

type ProjectsContentProps = {
  isPending: boolean
  projects: Parameters<typeof ProjectList>[0]['projects'] | undefined
}

function ProjectsContent({ isPending, projects }: ProjectsContentProps): JSX.Element | null {
  if (isPending) {
    return <p className="text-muted-foreground text-sm">Carregando projetos…</p>
  }

  if (projects === undefined) {
    return null
  }

  return <ProjectList projects={projects} />
}
