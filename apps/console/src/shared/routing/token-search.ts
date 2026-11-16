/** The `?token=` of an emailed link; anything else in the URL is ignored. */
export type TokenSearch = { token: string }

export function tokenSearch(search: Record<string, unknown>): TokenSearch {
  const token = search.token

  if (typeof token !== 'string') {
    return { token: '' }
  }

  return { token: token.trim() }
}
