import {
  asRecord,
  booleanField,
  nullableIntegerField,
  nullableStringField,
  stringField,
} from '../api/json-fields'

export const CONNECTION_PATH = '/database/v1/connection'

/** Printed instead of the password, which the server never shows again after a reset. */
export const PASSWORD_PLACEHOLDER = '[SENHA]'

export type ConnectionDetails = {
  enabled: boolean
  host: string | null
  port: number | null
  database: string
  user: string
  sslMode: string
  hasPassword: boolean
}

/** Where to connect when direct connections are on. */
export type ReachableConnection = ConnectionDetails & { host: string }

export function parseConnectionDetails(payload: unknown): ConnectionDetails {
  const record = asRecord(payload, 'connection')

  return {
    enabled: booleanField(record, 'enabled'),
    host: nullableStringField(record, 'host'),
    port: nullableIntegerField(record, 'port'),
    database: stringField(record, 'database'),
    user: stringField(record, 'user'),
    sslMode: stringField(record, 'ssl_mode'),
    hasPassword: booleanField(record, 'has_password'),
  }
}

/** Disabled on the server, or enabled without a public host: nothing to connect to. */
export function reachableConnectionOf(details: ConnectionDetails): ReachableConnection | undefined {
  const { enabled, host } = details

  if (enabled === false || host === null || host.trim() === '') {
    return undefined
  }

  return { ...details, host }
}

/** A `postgresql://` URL with the password slot filled by `[SENHA]`. */
export function maskedConnectionString(connection: ReachableConnection): string {
  const user = encodeURIComponent(connection.user)
  const database = encodeURIComponent(connection.database)
  const sslMode = encodeURIComponent(connection.sslMode)

  return `postgresql://${user}:${PASSWORD_PLACEHOLDER}@${hostAndPortOf(connection)}/${database}?sslmode=${sslMode}`
}

function hostAndPortOf(connection: ReachableConnection): string {
  const { host, port } = connection
  const bracketedHost = bracketed(host)

  if (port === null) {
    return bracketedHost
  }

  return `${bracketedHost}:${port}`
}

/** IPv6 addresses need brackets in a URL, or their colons read as a port. */
function bracketed(host: string): string {
  if (host.includes(':') && host.startsWith('[') === false) {
    return `[${host}]`
  }

  return host
}
