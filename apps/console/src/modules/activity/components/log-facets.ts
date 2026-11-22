import type { FacetField } from '@/modules/activity/components/log-facet-fields'
import type { components } from '@/shared/api/api-schema'
import type { Facet, FacetValue } from '@/shared/ui/field-facets'

type AuditEvent = components['schemas']['AuditEvent']

export type FacetSelection = Readonly<Record<string, string | undefined>>

/** The most frequent values of a field; the rest would only lengthen the panel. */
const MAX_VALUES = 8

/** Each field with how often each value appears in the loaded lines, most frequent first. */
export function facetsOf(
  events: readonly AuditEvent[],
  fields: readonly FacetField[],
  selected: FacetSelection,
): Facet[] {
  return fields.flatMap((field) => {
    const values = withPinned(countValues(events, field), pinnedValue(field, selected))

    if (values.length === 0) {
      return []
    }

    return [{ field: field.field, values }]
  })
}

/** Whether a line has every value picked among the fields counted over the loaded lines. */
export function matchesFields(
  event: AuditEvent,
  fields: readonly FacetField[],
  selected: FacetSelection,
): boolean {
  return fields.every((field) => {
    const wanted = selected[field.field]

    if (field.isSearched || wanted === undefined) {
      return true
    }

    return field.pick(event)?.value === wanted
  })
}

function countValues(events: readonly AuditEvent[], field: FacetField): FacetValue[] {
  const counts = new Map<string, FacetValue>()

  for (const event of events) {
    const pick = field.pick(event)

    if (pick !== null) {
      const count = counts.get(pick.value)?.count ?? 0
      counts.set(pick.value, { ...pick, count: count + 1 })
    }
  }

  return Array.from(counts.values())
    .toSorted((first, second) => second.count - first.count)
    .slice(0, MAX_VALUES)
}

/** A value picked over the loaded lines; the searched fields follow whatever the box holds. */
function pinnedValue(field: FacetField, selected: FacetSelection): string | undefined {
  if (field.isSearched) {
    return undefined
  }

  return selected[field.field]
}

/** A picked value stays in its list (with 0) so it can always be unpicked. */
function withPinned(values: FacetValue[], pinned: string | undefined): FacetValue[] {
  if (pinned === undefined || values.some((entry) => entry.value === pinned)) {
    return values
  }

  return [...values, { value: pinned, label: pinned, count: 0 }]
}
