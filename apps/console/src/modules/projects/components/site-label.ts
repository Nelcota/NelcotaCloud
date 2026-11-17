/** `https://app.acme.com/` reads as `app.acme.com`; a path stays, since it narrows redirects. */
export function siteLabel(siteUrl: string): string {
  try {
    const url = new URL(siteUrl)
    const path = url.pathname.replace(/\/$/, '')

    return `${url.host}${path}`
  } catch {
    return siteUrl
  }
}
