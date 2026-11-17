import type { components } from '@/shared/api/api-schema'

type ProjectSummary = components['schemas']['ProjectSummary']
type ProjectRole = ProjectSummary['role']

export type RoleFilter = 'all' | ProjectRole
export type SortKey = 'name' | 'role' | 'created_at'
export type ProjectSort = { key: SortKey; isAscending: boolean }

/** What the projects table shows: a search, a role and an order. */
export type ProjectQuery = { search: string; role: RoleFilter; sort: ProjectSort }

export const DEFAULT_QUERY: ProjectQuery = {
  search: '',
  role: 'all',
  sort: { key: 'name', isAscending: true },
}

const LOCALE = 'pt-BR'
const ROLE_ORDER: Record<ProjectRole, number> = { owner: 0, member: 1 }
const COMPARATORS: Record<SortKey, (a: ProjectSummary, b: ProjectSummary) => number> = {
  name: (a, b) => a.name.localeCompare(b.name, LOCALE, { sensitivity: 'base' }),
  role: (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role],
  created_at: (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
}

/** The projects that match the search (name, slug or site) and role, in the chosen order. */
export function queryProjects(projects: ProjectSummary[], query: ProjectQuery): ProjectSummary[] {
  const term = query.search.trim().toLocaleLowerCase(LOCALE)
  const compare = COMPARATORS[query.sort.key]
  const direction = directionOf(query.sort)

  return projects
    .filter((project) => matchesRole(project, query.role) && matchesSearch(project, term))
    .toSorted((a, b) => compare(a, b) * direction)
}

/** Clicking the sorted column flips it; another column starts ascending. */
export function nextSort(current: ProjectSort, key: SortKey): ProjectSort {
  if (current.key === key) {
    return { key, isAscending: current.isAscending === false }
  }

  return { key, isAscending: true }
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

function directionOf(sort: ProjectSort): number {
  if (sort.isAscending) {
    return 1
  }

  return -1
}
