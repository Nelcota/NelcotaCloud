import { SearchX } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import { ProjectCards } from '@/modules/projects/components/project-cards'
import {
  DEFAULT_QUERY,
  type ProjectQuery,
  type ProjectView,
  isFiltered,
  queryProjects,
} from '@/modules/projects/components/project-query'
import { ProjectsTable } from '@/modules/projects/components/projects-table'
import { ProjectsToolbar } from '@/modules/projects/components/projects-toolbar'
import type { components } from '@/shared/api/api-schema'
import { EmptyState } from '@/shared/ui/empty-state'
import { Button } from '@/shared/ui/primitives/button'

type ProjectSummary = components['schemas']['ProjectSummary']

/** The projects as cards or a table, with a search, a role filter and how many match. */
export function ProjectsBrowser({ projects }: { projects: ProjectSummary[] }): JSX.Element {
  const [query, setQuery] = useState<ProjectQuery>(DEFAULT_QUERY)
  const [view, setView] = useState<ProjectView>('cards')
  const shown = queryProjects(projects, query)

  return (
    <div className="flex flex-col gap-4">
      <ProjectsToolbar
        query={query}
        shown={shown.length}
        total={projects.length}
        view={view}
        onViewChange={setView}
        onChange={setQuery}
      />
      <Results projects={shown} query={query} view={view} onClear={() => setQuery(DEFAULT_QUERY)} />
    </div>
  )
}

type ResultsProps = {
  projects: ProjectSummary[]
  query: ProjectQuery
  view: ProjectView
  onClear: () => void
}

function Results({ projects, query, view, onClear }: ResultsProps): JSX.Element {
  if (projects.length === 0 && isFiltered(query)) {
    return (
      <EmptyState
        isFramed
        isCompact
        icon={<SearchX aria-hidden />}
        title="Nenhum projeto encontrado"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            Limpar filtros
          </Button>
        }
      />
    )
  }

  if (view === 'cards') {
    return <ProjectCards projects={projects} />
  }

  return <ProjectsTable projects={projects} />
}
