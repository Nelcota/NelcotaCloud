import type { components } from '@/shared/api/api-schema'

type AuditEvent = components['schemas']['AuditEvent']

/** The facts worth a glance in the row, in reading order; the rest stays in the detail panel. */
const SHORT_DETAILS: readonly { key: string; prefix: string }[] = [
  { key: 'table', prefix: 'tabela ' },
  { key: 'name', prefix: '' },
  { key: 'email', prefix: '' },
  { key: 'role', prefix: '' },
  { key: 'network', prefix: '' },
]

/** A short line from the event's details ("tabela notes · create"); empty when it has none. */
export function detailText(event: AuditEvent): string {
  const details = textDetails(event)

  return SHORT_DETAILS.flatMap(({ key, prefix }) => {
    const value = details.get(key)

    if (value === undefined) {
      return []
    }

    return [`${prefix}${value}`]
  }).join(' · ')
}

/** The text facts the short line leaves out, as key and value pairs for the log's chips. */
export function extraDetails(event: AuditEvent): [string, string][] {
  const shortKeys = new Set(SHORT_DETAILS.map((detail) => detail.key))
  const entries = Array.from(textDetails(event))

  return entries.filter(([key]) => shortKeys.has(key) === false)
}

/** One text fact from the event's details; `null` when it does not have it. */
export function detailValue(event: AuditEvent, key: string): string | null {
  return textDetails(event).get(key) ?? null
}

/** The details as formatted JSON for the detail panel; `null` when the event has none. */
export function detailsJson(event: AuditEvent): string | null {
  const details = event.details ?? null

  if (details === null || Object.keys(details).length === 0) {
    return null
  }

  return JSON.stringify(details, null, 2)
}

/** Only the text values: the details come from the API as a loose object. */
function textDetails(event: AuditEvent): ReadonlyMap<string, string> {
  const entries = Object.entries<unknown>(event.details ?? {})
  const texts = new Map<string, string>()

  for (const [key, value] of entries) {
    if (typeof value === 'string' && value.trim() !== '') {
      texts.set(key, value)
    }
  }

  return texts
}
