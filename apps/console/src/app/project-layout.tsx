import { Link, Outlet } from '@tanstack/react-router'
import type { JSX } from 'react'

import { useProjectsQuery } from '@/modules/projects/queries/use-projects'
import { useProjectId } from '@/shared/routing/use-project-id'

const SECTIONS = [
  { to: '/projects/$projectId', label: 'Chaves', exact: true },
  { to: '/projects/$projectId/users', label: 'Usuários', exact: false },
  { to: '/projects/$projectId/providers', label: 'Login social', exact: false },
  { to: '/projects/$projectId/email', label: 'Email', exact: false },
  { to: '/projects/$projectId/settings', label: 'Configurações', exact: false },
] as const

/** A project's name and its sections; each section is its own route. */
export function ProjectLayout(): JSX.Element {
  const projectId = useProjectId()
  const projects = useProjectsQuery()
  const project = projects.data?.find((candidate) => candidate.id === projectId)

  return (
    <div className="grid gap-6">
      <div className="space-y-1">
        <Link to="/" className="text-muted-foreground text-sm hover:underline">
          ← Projetos
        </Link>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {project?.name ?? 'Projeto'}
        </h1>
        <p className="text-muted-foreground font-mono text-xs">{project?.slug}</p>
      </div>
      <nav aria-label="Seções do projeto" className="flex flex-wrap gap-1 border-b">
        {SECTIONS.map((section) => (
          <Link
            key={section.to}
            to={section.to}
            params={{ projectId }}
            activeOptions={{ exact: section.exact }}
            className="text-muted-foreground hover:text-foreground -mb-px border-b-2 border-transparent px-3 py-2 text-sm"
            activeProps={{ className: 'border-foreground text-foreground font-medium' }}
          >
            {section.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
