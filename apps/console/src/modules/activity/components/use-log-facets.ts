import { useState } from 'react'

import { facetFieldsFor } from '@/modules/activity/components/log-facet-fields'
import {
  type FacetSelection,
  facetsOf,
  matchesFields,
} from '@/modules/activity/components/log-facets'
import type { ActivityFiltersControl } from '@/modules/activity/components/use-activity-filters'
import type { components } from '@/shared/api/api-schema'
import type { Facet } from '@/shared/ui/field-facets'

type AuditEvent = components['schemas']['AuditEvent']

export type LogFacets = {
  facets: Facet[]
  selected: FacetSelection
  onSelect: (field: string, value: string | undefined) => void
  /** The loaded lines that have every value picked; `undefined` while the first page loads. */
  shown: AuditEvent[] | undefined
  /** How many lines are loaded, the base of every count. */
  loadedCount: number
  isFieldFiltered: boolean
  clearFields: () => void
}

type LogFacetsScope = {
  events: AuditEvent[] | undefined
  control: ActivityFiltersControl
  showsUser: boolean
}

/**
 * "Campos detectados": IP and user go to the API's search, which already filters by them; the
 * other fields have no API filter, so they narrow the loaded lines only.
 */
export function useLogFacets({ events, control, showsUser }: LogFacetsScope): LogFacets {
  const [picked, setPicked] = useState<FacetSelection>({})
  const fields = facetFieldsFor(showsUser)
  const search = control.filters.search
  const selected = { ...picked, ...searchedSelection(search, showsUser) }

  function onSelect(field: string, value: string | undefined): void {
    const descriptor = fields.find((candidate) => candidate.field === field)

    if (descriptor?.isSearched === true) {
      control.showAddress(value ?? '')
      return
    }

    setPicked({ ...picked, [field]: value })
  }

  return {
    facets: facetsOf(events ?? [], fields, selected),
    selected,
    onSelect,
    shown: events?.filter((event) => matchesFields(event, fields, picked)),
    loadedCount: events?.length ?? 0,
    isFieldFiltered: Object.values(picked).some((value) => value !== undefined),
    clearFields: () => setPicked({}),
  }
}

function searchedSelection(search: string, showsUser: boolean): FacetSelection {
  if (search === '') {
    return {}
  }

  if (showsUser) {
    return { ip: search, usuário: search }
  }

  return { ip: search }
}
