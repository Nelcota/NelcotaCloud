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
