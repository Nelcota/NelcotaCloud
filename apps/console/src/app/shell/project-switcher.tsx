import { Check, ChevronsUpDown, LayoutGrid, Plus } from 'lucide-react'
import type { JSX } from 'react'

import { ProjectAvatar } from '@/app/shell/project-avatar'
import { useCurrentProject, useProjectsQuery } from '@/modules/projects/queries/use-projects'
import { RouterLink } from '@/shared/routing/router-link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu'

/** The open project, with a menu to switch to another one or start a new one. */
export function ProjectSwitcher({ projectId }: { projectId: string }): JSX.Element {
  const project = useCurrentProject(projectId)
  const projects = useProjectsQuery()
  const name = project?.name ?? 'Projeto'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Trocar projeto: ${name}`}
        className="flex w-full min-w-0 items-center gap-2.5 rounded-[10px] p-2 text-start hover:bg-surface aria-expanded:bg-surface"
      >
        <ProjectAvatar name={name} mascotId={project?.mascot_id} size="sm" />
        <span className="grid min-w-0 flex-1">
          <span className="truncate text-base font-medium text-heading">{name}</span>
          <span className="truncate font-mono text-2xs text-muted-foreground">
            {project?.slug ?? ''}
          </span>
        </span>
        <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Projetos</DropdownMenuLabel>
        <DropdownMenuGroup className="max-h-72 overflow-y-auto">
          {(projects.data ?? []).map((candidate) => (
            <DropdownMenuItem key={candidate.id} asChild>
              <RouterLink href={`/projects/${candidate.id}`}>
                <ProjectAvatar name={candidate.name} mascotId={candidate.mascot_id} size="xs" />
                <span className="truncate">{candidate.name}</span>
                {candidate.id === projectId && <Check aria-hidden className="ms-auto" />}
              </RouterLink>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <RouterLink href="/">
              <LayoutGrid aria-hidden />
              Todos os projetos
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <RouterLink href="/projects/new">
              <Plus aria-hidden />
              Novo projeto
            </RouterLink>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
