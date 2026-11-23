import { CliError } from '../cli/cli-error'

/** A JSON object read from outside the CLI (an API response or a local file). */
export type JsonRecord = Record<string, unknown>

/** Fails with the field's name, so a server and CLI out of step are easy to spot. */
function unexpected(field: string): CliError {
  return new CliError(`Resposta em formato inesperado (campo ${field}).`)
}

export function asRecord(value: unknown, field: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw unexpected(field)
  }

  return Object.fromEntries(Object.entries(value))
}

export function stringField(record: JsonRecord, field: string): string {
  const value = record[field]

  if (typeof value !== 'string') {
    throw unexpected(field)
  }

  return value
}

export function nullableStringField(record: JsonRecord, field: string): string | null {
  const value = record[field]

  if (value === null || value === undefined) {
    return null
  }

  return stringField(record, field)
}

export function integerField(record: JsonRecord, field: string): number {
  const value = record[field]

  if (typeof value !== 'number' || Number.isSafeInteger(value) === false) {
    throw unexpected(field)
  }

  return value
}

export function nullableIntegerField(record: JsonRecord, field: string): number | null {
  const value = record[field]

  if (value === null || value === undefined) {
    return null
  }

  return integerField(record, field)
}

export function booleanField(record: JsonRecord, field: string): boolean {
  const value = record[field]

  if (typeof value !== 'boolean') {
    throw unexpected(field)
  }

  return value
}

export function arrayField(record: JsonRecord, field: string): readonly unknown[] {
  const value = record[field]

  if (Array.isArray(value) === false) {
    throw unexpected(field)
  }

  return value
}
