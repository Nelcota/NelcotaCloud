import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { Badge } from '@/shared/ui/badge'

type ProjectSummary = components['schemas']['ProjectSummary']

export function ProjectList({ projects }: { projects: ProjectSummary[] }): JSX.Element {
  if (projects.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        Nenhum projeto ainda. Crie o primeiro para ter um Auth pronto para o seu app.
      </p>
    )
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            to="/projects/$projectId"
            params={{ projectId: project.id }}
            className="hover:bg-muted/50 focus-visible:ring-ring/50 block rounded-lg border p-4 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{project.name}</span>
              <Badge variant="secondary">{project.role}</Badge>
            </div>
            <p className="text-muted-foreground mt-1 font-mono text-xs">{project.slug}</p>
            <p className="text-muted-foreground mt-2 truncate text-xs">{project.site_url}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
