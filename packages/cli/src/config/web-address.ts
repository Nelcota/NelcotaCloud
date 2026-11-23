/** An absolute http(s) address, such as `https://api.example.com`. */
export function isWebAddress(value: string): boolean {
  try {
    const url = new URL(value)

    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

/** Joins paths without doubled slashes: `http://host/` and `http://host` are the same API. */
export function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}
