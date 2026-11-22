import type { JSX } from 'react'

import type {
  ProjectQuery,
  ProjectView,
  RoleFilter,
} from '@/modules/projects/components/project-query'
import { ProjectViewToggle } from '@/modules/projects/components/project-view-toggle'
import { SearchField } from '@/shared/ui/search-field'
import { SegmentedControl } from '@/shared/ui/segmented-control'

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'owner', label: 'Dono' },
  { value: 'member', label: 'Membro' },
]

type ProjectsToolbarProps = {
  query: ProjectQuery
  shown: number
  total: number
  view: ProjectView
  onViewChange: (view: ProjectView) => void
  onChange: (query: ProjectQuery) => void
}

/** Search by name, slug or site; filter by role; how many projects match; cards or table. */
export function ProjectsToolbar(props: ProjectsToolbarProps): JSX.Element {
  const { query, onChange } = props

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchField
        label="Buscar projeto"
        className="sm:max-w-64"
        hasSlashShortcut
        value={query.search}
        onValueChange={(search) => onChange({ ...query, search })}
      />
      <SegmentedControl
        label="Filtrar por papel"
        options={ROLE_OPTIONS}
        value={query.role}
        onValueChange={(role) => onChange({ ...query, role: roleFilterOf(role) })}
      />
      <span role="status" className="text-xs text-muted-foreground tabular-nums">
        {countLabel(props.shown, props.total)}
      </span>
      <div className="ms-auto">
        <ProjectViewToggle view={props.view} onViewChange={props.onViewChange} />
      </div>
    </div>
  )
}

function roleFilterOf(value: string): RoleFilter {
  return ROLE_OPTIONS.find((option) => option.value === value)?.value ?? 'all'
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
