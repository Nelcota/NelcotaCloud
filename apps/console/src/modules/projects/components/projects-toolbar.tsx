import type { JSX } from 'react'

import type { ProjectQuery, RoleFilter } from '@/modules/projects/components/project-query'
import { FilterPills } from '@/shared/ui/filter-pills'
import { SearchInput } from '@/shared/ui/search-input'

const ROLE_OPTIONS: readonly { value: RoleFilter; label: string }[] = [
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
      <SearchInput
        label="Buscar por nome, slug ou site"
        value={query.search}
        onChange={(search) => onChange({ ...query, search })}
      />
      <FilterPills
        label="Filtrar por papel"
        options={ROLE_OPTIONS}
        value={query.role}
        onChange={(role) => onChange({ ...query, role })}
      />
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
