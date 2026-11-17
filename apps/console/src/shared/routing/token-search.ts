/** Reads emailed tokens from fragments; query support remains for previously sent links. */
export function tokenFromLocation(): string {
  const url = new URL(window.location.href)
  const fragmentToken = new URLSearchParams(url.hash.slice(1)).get('token')

  return (fragmentToken ?? url.searchParams.get('token') ?? '').trim()
}

/** Removes one-time tokens from browser history after the page has captured them. */
export function clearTokenFromLocation(): void {
  const url = new URL(window.location.href)

  url.searchParams.delete('token')

  if (new URLSearchParams(url.hash.slice(1)).has('token')) {
    url.hash = ''
  }

  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}
