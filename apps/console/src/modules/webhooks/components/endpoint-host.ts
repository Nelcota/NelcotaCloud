/** Titles name an endpoint by its host; the full URL, which can be long, is shown elsewhere. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

/** The part after the host, shown under it in the list; `/` when the URL has no path. */
export function pathOf(url: string): string {
  try {
    const parsed = new URL(url)

    return `${parsed.pathname}${parsed.search}`
  } catch {
    return ''
  }
}

/** What names an endpoint: the name its owner gave it, or its host. */
export function endpointTitle(endpoint: { url: string; description?: string | null }): string {
  const description = endpoint.description ?? ''

  if (description === '') {
    return hostOf(endpoint.url)
  }

  return description
}
