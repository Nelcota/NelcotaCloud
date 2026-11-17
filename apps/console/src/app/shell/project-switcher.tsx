import { useNavigate } from '@tanstack/react-router'
import Check from '~icons/solar/check-linear'
import ChevronsUpDown from '~icons/solar/sort-vertical-linear'
import FolderKanban from '~icons/solar/folder-with-files-linear'
import Plus from '~icons/solar/add-linear'
import type { JSX } from 'react'

import { ApiStatusDot } from '@/app/shell/api-status-dot'
import { useCurrentProject, useProjectsQuery } from '@/modules/projects/queries/use-projects'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

/** The sidebar's header: the open project, the API status, and a way to any other project. */
export function ProjectSwitcher({ projectId }: { projectId: string }): JSX.Element {
  const navigate = useNavigate()
  const projects = useProjectsQuery()
  const current = useCurrentProject(projectId)
  const name = current?.name ?? 'Projeto'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-sidebar-accent aria-expanded:bg-sidebar-accent flex w-full min-w-0 items-center gap-3 rounded-lg p-2 text-left transition-colors">
        <span className="bg-secondary text-secondary-foreground relative flex size-11 shrink-0 items-center justify-center rounded-lg text-lg font-semibold">
          <span aria-hidden="true">{initialOf(name)}</span>
          <ApiStatusDot />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base leading-tight font-semibold">{name}</span>
          <span className="text-muted-foreground block truncate font-mono text-xs">
            {current?.slug}
          </span>
        </span>
        <ChevronsUpDown className="text-muted-foreground size-5 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Seus projetos</DropdownMenuLabel>
          {(projects.data ?? []).map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() =>
                navigate({ to: '/projects/$projectId', params: { projectId: project.id } })
              }
            >
              <span className="min-w-0 flex-1 truncate">{project.name}</span>
              <CurrentMark isCurrent={project.id === projectId} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: '/' })}>
          <FolderKanban />
          Todos os projetos
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: '/projects/new' })}>
          <Plus />
          Novo projeto
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The first letter of the project's name, as a stand-in for a project logo. */
function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}

function CurrentMark({ isCurrent }: { isCurrent: boolean }): JSX.Element | null {
  if (isCurrent === false) {
    return null
  }

  return <Check aria-label="Projeto atual" className="text-primary-ink size-5" />
}
