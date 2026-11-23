import { CliError } from '../cli/cli-error'
import { ENV_KEYS } from './dev-environment'
import type { DevEnvironment } from './dev-environment'

const MIN_ADMIN_TOKEN_LENGTH = 32
const MAX_PORT = 65_535

/** Reads the `.env` the CLI wrote, refusing values the stack could not start with. */
export function parseEnvFile(text: string): DevEnvironment {
  const values = new Map(text.split(/\r?\n/).flatMap(entryOf))

  return {
    projectName: matching(values, ENV_KEYS.projectName, /^[a-z0-9][a-z0-9_-]*$/),
    apiPort: portOf(values, ENV_KEYS.apiPort),
    postgresPort: portOf(values, ENV_KEYS.postgresPort),
    mailpitPort: portOf(values, ENV_KEYS.mailpitPort),
    postgresPassword: matching(values, ENV_KEYS.postgresPassword, /^[A-Za-z0-9]{16,}$/),
    masterKeyHex: matching(values, ENV_KEYS.masterKeyHex, /^[0-9a-fA-F]{64}$/),
    adminToken: adminTokenOf(values),
  }
}

function entryOf(line: string): [string, string][] {
  const trimmed = line.trim()
  const separator = trimmed.indexOf('=')

  if (trimmed === '' || trimmed.startsWith('#') || separator < 1) {
    return []
  }

  return [[trimmed.slice(0, separator).trim(), trimmed.slice(separator + 1).trim()]]
}

function invalid(key: string): CliError {
  return new CliError(`Valor inválido em .nelcota/dev/.env: ${key}. Corrija o arquivo.`)
}

function matching(values: ReadonlyMap<string, string>, key: string, pattern: RegExp): string {
  const value = values.get(key) ?? ''

  if (pattern.test(value) === false) {
    throw invalid(key)
  }

  return value
}

function portOf(values: ReadonlyMap<string, string>, key: string): number {
  const port = Number(matching(values, key, /^\d{1,5}$/))

  if (port < 1 || port > MAX_PORT) {
    throw invalid(key)
  }

  return port
}

function adminTokenOf(values: ReadonlyMap<string, string>): string {
  const token = matching(values, ENV_KEYS.adminToken, /^\S+$/)

  if (token.length < MIN_ADMIN_TOKEN_LENGTH) {
    throw invalid(ENV_KEYS.adminToken)
  }

  return token
}
