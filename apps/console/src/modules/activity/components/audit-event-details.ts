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
