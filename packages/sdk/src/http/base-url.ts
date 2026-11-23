/**
 * `https://api.test///` becomes `https://api.test`. A loop instead of `/\/+$/`, whose
 * backtracking grows with the number of slashes in a URL the app passes in.
 */
export function withoutTrailingSlashes(url: string): string {
  let end = url.length

  while (end > 0 && url.charAt(end - 1) === '/') {
    end -= 1
  }

  return url.slice(0, end)
}
