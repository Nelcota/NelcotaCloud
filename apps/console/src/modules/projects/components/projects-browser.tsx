import SearchX from '~icons/solar/magnifier-close-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import {
  DEFAULT_QUERY,
  type ProjectQuery,
  type SortKey,
  isFiltered,
  nextSort,
  queryProjects,
} from '@/modules/projects/components/project-query'
import { ProjectsTable } from '@/modules/projects/components/projects-table'
import { ProjectsToolbar } from '@/modules/projects/components/projects-toolbar'
import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'

type ProjectSummary = components['schemas']['ProjectSummary']

/** The projects table with its search, role filter and sorting, all done in the browser. */
export function ProjectsBrowser({ projects }: { projects: ProjectSummary[] }): JSX.Element {
  const [query, setQuery] = useState<ProjectQuery>(DEFAULT_QUERY)
  const shown = queryProjects(projects, query)

  function sortBy(key: SortKey): void {
    setQuery({ ...query, sort: nextSort(query.sort, key) })
  }

  return (
    <div className="grid gap-4">
      <ProjectsToolbar
        query={query}
        shown={shown.length}
        total={projects.length}
        onChange={setQuery}
      />
      <Results
        projects={shown}
        query={query}
        onSort={sortBy}
        onClear={() => setQuery({ ...DEFAULT_QUERY, sort: query.sort })}
      />
    </div>
  )
}

type ResultsProps = {
  projects: ProjectSummary[]
  query: ProjectQuery
  onSort: (key: SortKey) => void
  onClear: () => void
}

function Results({ projects, query, onSort, onClear }: ResultsProps): JSX.Element {
  if (projects.length === 0 && isFiltered(query)) {
    return (
      <EmptyState
        icon={SearchX}
        title="Nenhum projeto encontrado"
        description="Nenhum projeto combina com a busca e o filtro escolhidos."
        action={
          <Button variant="outline" onClick={onClear}>
            Limpar filtros
          </Button>
        }
      />
    )
  }

  return <ProjectsTable projects={projects} sort={query.sort} onSort={onSort} />
}
