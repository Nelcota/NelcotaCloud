export type SmtpSecurity = 'tls' | 'starttls'

export type SmtpServer = {
  host: string
  port: number
  security: SmtpSecurity
  username: string
  password: string
}

const SCHEMES: Record<SmtpSecurity, string> = { tls: 'smtps', starttls: 'smtp' }

/** STARTTLS must be required: the API refuses a connection that could stay in plain text. */
const QUERIES: Record<SmtpSecurity, string> = { tls: '', starttls: '?tls=required' }

/**
 * The SMTP URL the API expects, so nobody has to assemble it: `smtps://user:pass@host:465` or
 * `smtp://user:pass@host:587?tls=required`. Credentials are encoded, since `@`, `:` and `/`
 * are common in usernames (email addresses) and passwords.
 */
export function buildSmtpUrl(server: SmtpServer): string {
  const username = encodeURIComponent(server.username)
  const password = encodeURIComponent(server.password)
  const scheme = SCHEMES[server.security]
  const query = QUERIES[server.security]

  return `${scheme}://${username}:${password}@${server.host}:${server.port}${query}`
}
