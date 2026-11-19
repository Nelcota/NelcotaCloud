/** Characters that make a display name need quotes in an address (RFC 5322 specials). */
const SPECIALS = /[()<>[\]:;@\\,."]/

/** The sender the API expects, `Acme <no-reply@acme.com>`, built from a name and an address. */
export function formatSender(name: string, email: string): string {
  const displayName = name.trim()
  const address = email.trim()

  if (displayName === '') {
    return address
  }

  if (SPECIALS.test(displayName)) {
    const escaped = displayName.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
    return `"${escaped}" <${address}>`
  }

  return `${displayName} <${address}>`
}
