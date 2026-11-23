/** Where the password goes in a connection string the console cannot know it for. */
export const PASSWORD_PLACEHOLDER = '[SENHA]'

type ConnectionParts = {
  user: string
  host?: string | null
  port?: number | null
  database: string
  ssl_mode: string
}

/** The `postgresql://` URL with the password left out, ready for a `.env` once it is filled in. */
export function maskedConnectionString(parts: ConnectionParts): string {
  const host = parts.host ?? ''
  const port = portSuffix(parts.port ?? null)
  const user = encodeURIComponent(parts.user)
  const database = encodeURIComponent(parts.database)
  const sslMode = encodeURIComponent(parts.ssl_mode)

  return `postgresql://${user}:${PASSWORD_PLACEHOLDER}@${host}${port}/${database}?sslmode=${sslMode}`
}

function portSuffix(port: number | null): string {
  if (port === null) {
    return ''
  }

  return `:${port}`
}
