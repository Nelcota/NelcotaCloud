/** Titles name an endpoint by its host; the full URL, which can be long, goes elsewhere. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
