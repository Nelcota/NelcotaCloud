import type { UsersSearch } from './users-search.ts'

/** The list each project last showed, kept for this tab only (it resets on reload). */
const lastSearchByProject = new Map<string, UsersSearch>()

/** Called by the list as its filter or page changes. */
export function rememberUsersSearch(projectId: string, search: UsersSearch): void {
  lastSearchByProject.set(projectId, search)
}

/** Where a user's page "← Usuários" leads: the list as it was left, or the whole list. */
export function lastUsersSearch(projectId: string): UsersSearch {
  return lastSearchByProject.get(projectId) ?? {}
}
