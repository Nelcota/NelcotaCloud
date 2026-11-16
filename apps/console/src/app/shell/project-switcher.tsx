import { useNavigate } from '@tanstack/react-router'
import { Check, ChevronsUpDown, FolderKanban, Plus } from 'lucide-react'
import type { JSX } from 'react'

import { useProjectsQuery } from '@/modules/projects/queries/use-projects'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

/** The current project, and a quick way to another one or to a new project. */
export function ProjectSwitcher({ projectId }: { projectId: string }): JSX.Element {
  const navigate = useNavigate()
  const projects = useProjectsQuery()
  const current = projects.data?.find((project) => project.id === projectId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-accent flex min-h-10 min-w-0 items-center gap-3 rounded-md px-2 text-left transition-colors">
        <span className="bg-secondary text-secondary-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
          <FolderKanban className="size-4" strokeWidth={1.75} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{current?.name ?? 'Projeto'}</span>
          <span className="text-muted-foreground block truncate font-mono text-xs">
            {current?.slug}
          </span>
        </span>
        <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" strokeWidth={1.75} />
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
        <DropdownMenuItem onClick={() => navigate({ to: '/projects/new' })}>
          <Plus className="size-4" strokeWidth={1.75} />
          Novo projeto
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function CurrentMark({ isCurrent }: { isCurrent: boolean }): JSX.Element | null {
  if (isCurrent === false) {
    return null
  }

  return <Check aria-label="Projeto atual" className="text-primary size-4" strokeWidth={2} />
}
