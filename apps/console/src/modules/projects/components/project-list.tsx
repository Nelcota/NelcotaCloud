import { Link } from '@tanstack/react-router'
import { ArrowUpRight, FolderKanban, Plus } from 'lucide-react'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { Badge } from '@/shared/ui/badge'
import { buttonVariants } from '@/shared/ui/button-variants'
import { EmptyState } from '@/shared/ui/empty-state'

type ProjectSummary = components['schemas']['ProjectSummary']

const ROLE_LABELS: Record<ProjectSummary['role'], string> = { owner: 'Dono', member: 'Membro' }

export function ProjectList({ projects }: { projects: ProjectSummary[] }): JSX.Element {
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Nenhum projeto ainda"
        description="Crie o primeiro para ter usuários, chaves de API e login social prontos para o seu app."
        action={
          <Link to="/projects/new" className={buttonVariants()}>
            <Plus strokeWidth={2} />
            Criar o primeiro projeto
          </Link>
        }
      />
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <li key={project.id}>
          <ProjectCard project={project} />
        </li>
      ))}
    </ul>
  )
}

function ProjectCard({ project }: { project: ProjectSummary }): JSX.Element {
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="group bg-card hover:border-primary/50 flex h-full flex-col rounded-xl border p-5 transition-[border-color,box-shadow,transform] hover:shadow-lg hover:shadow-black/5 motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
          <FolderKanban className="text-primary size-5" strokeWidth={1.75} />
        </span>
        <Badge variant="outline">{ROLE_LABELS[project.role]}</Badge>
      </div>
      <span className="mt-4 flex items-center gap-1 font-semibold">
        <span className="truncate">{project.name}</span>
        <ArrowUpRight
          className="text-muted-foreground size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          strokeWidth={1.75}
        />
      </span>
      <span className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
        {project.slug}
      </span>
      <span aria-hidden="true" className="min-h-4 flex-1" />
      <span className="text-muted-foreground truncate border-t pt-3 text-xs">
        {project.site_url}
      </span>
    </Link>
  )
}
