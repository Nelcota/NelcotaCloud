/** Email links carry their token in the URL fragment (`#token=…`), which never reaches servers. */
export function readLinkToken(): string | null {
  const fragment = new URLSearchParams(window.location.hash.slice(1))

  return fragment.get('token')
}

/** Drops the token from the address bar and history once it has been read. */
export function clearLinkToken(): void {
  const { pathname, search } = window.location
  window.history.replaceState(window.history.state, '', `${pathname}${search}`)
}
