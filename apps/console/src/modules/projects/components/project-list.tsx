import { Link } from '@tanstack/react-router'
import { FolderKanban, Plus } from 'lucide-react'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { buttonVariants } from '@/shared/ui/button-variants'

type ProjectSummary = components['schemas']['ProjectSummary']

const ROLE_LABELS: Record<ProjectSummary['role'], string> = { owner: 'Dono', member: 'Membro' }

export function ProjectList({ projects }: { projects: ProjectSummary[] }): JSX.Element {
  if (projects.length === 0) {
    return (
      <div className="bg-card flex flex-col items-center rounded-xl border px-6 py-14 text-center">
        <FolderKanban className="text-muted-foreground size-8" strokeWidth={1.5} />
        <h2 className="mt-4 font-semibold">Nenhum projeto ainda</h2>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          Um projeto é o Auth de um app: usuários, chaves e login social próprios.
        </p>
        <Link to="/projects/new" className={buttonVariants({ className: 'mt-6' })}>
          <Plus className="size-4" strokeWidth={2} />
          Criar o primeiro projeto
        </Link>
      </div>
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            to="/projects/$projectId"
            params={{ projectId: project.id }}
            className="bg-card hover:border-primary/50 flex h-full flex-col rounded-xl border p-5 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="bg-secondary flex size-10 items-center justify-center rounded-lg">
                <FolderKanban className="text-primary size-5" strokeWidth={1.75} />
              </span>
              <span className="text-muted-foreground text-xs">{ROLE_LABELS[project.role]}</span>
            </div>
            <span className="mt-4 font-semibold">{project.name}</span>
            <span className="text-muted-foreground mt-0.5 font-mono text-xs">{project.slug}</span>
            <span className="text-muted-foreground mt-4 truncate border-t pt-3 text-xs">
              {project.site_url}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
