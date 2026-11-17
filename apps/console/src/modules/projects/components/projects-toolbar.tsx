import Search from '~icons/solar/magnifier-linear'
import type { JSX } from 'react'

import type { ProjectQuery, RoleFilter } from '@/modules/projects/components/project-query'
import { cn } from '@/shared/lib/class-names'
import { Input } from '@/shared/ui/input'

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'owner', label: 'Dono' },
  { value: 'member', label: 'Membro' },
]

type ProjectsToolbarProps = {
  query: ProjectQuery
  shown: number
  total: number
  onChange: (query: ProjectQuery) => void
}

/** Search by name, slug or site; filter by role; and how many projects match. */
export function ProjectsToolbar({
  query,
  shown,
  total,
  onChange,
}: ProjectsToolbarProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <Search
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
        />
        <Input
          type="search"
          aria-label="Buscar projetos"
          placeholder="Buscar por nome, slug ou site"
          className="pl-9"
          value={query.search}
          onChange={(event) => onChange({ ...query, search: event.target.value })}
        />
      </div>
      <div
        role="group"
        aria-label="Filtrar por papel"
        className="bg-muted/40 flex w-fit rounded-lg border p-0.5"
      >
        {ROLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={query.role === option.value}
            onClick={() => onChange({ ...query, role: option.value })}
            className={cn(
              'text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm font-medium transition-[color,background-color,transform] active:scale-[0.97] motion-reduce:active:scale-100',
              query.role === option.value && 'bg-accent text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p role="status" className="text-muted-foreground text-sm sm:ml-auto">
        {countLabel(shown, total)}
      </p>
    </div>
  )
}

function countLabel(shown: number, total: number): string {
  const noun = projectNoun(total)

  if (shown === total) {
    return `${total} ${noun}`
  }

  return `${shown} de ${total} ${noun}`
}

function projectNoun(total: number): string {
  if (total === 1) {
    return 'projeto'
  }

  return 'projetos'
}
