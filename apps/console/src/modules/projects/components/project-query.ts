import type { components } from '@/shared/api/api-schema'

type ProjectSummary = components['schemas']['ProjectSummary']
type ProjectRole = ProjectSummary['role']

export type RoleFilter = 'all' | ProjectRole
export type ProjectView = 'cards' | 'table'

/** What the project list shows: a search and a role. */
export type ProjectQuery = { search: string; role: RoleFilter }

export const DEFAULT_QUERY: ProjectQuery = { search: '', role: 'all' }

const LOCALE = 'pt-BR'

/** The projects that match the search (name, slug or site) and role, by name. */
export function queryProjects(projects: ProjectSummary[], query: ProjectQuery): ProjectSummary[] {
  const term = query.search.trim().toLocaleLowerCase(LOCALE)

  return projects
    .filter((project) => matchesRole(project, query.role) && matchesSearch(project, term))
    .toSorted((a, b) => a.name.localeCompare(b.name, LOCALE, { sensitivity: 'base' }))
}

export function isFiltered(query: ProjectQuery): boolean {
  return query.search.trim() !== '' || query.role !== 'all'
}

function matchesRole(project: ProjectSummary, role: RoleFilter): boolean {
  return role === 'all' || project.role === role
}

function matchesSearch(project: ProjectSummary, term: string): boolean {
  if (term === '') {
    return true
  }

  return [project.name, project.slug, project.site_url].some((field) =>
    field.toLocaleLowerCase(LOCALE).includes(term),
  )
}
