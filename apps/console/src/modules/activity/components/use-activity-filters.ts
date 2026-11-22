import { useEffect, useState } from 'react'

import type { AuditFilter, AuditKind } from '@/modules/activity/api/list-audit-events'
import type { KindFilter } from '@/modules/activity/components/activity-filters'

/** Long enough to let someone finish typing an address before the log is read again. */
const SEARCH_DELAY_MS = 300

export type ActivityFilters = {
  /** The period; the whole log when undefined (a user's page has no period control). */
  days?: number
  kind: KindFilter
  /** What is in the search box right now. */
  searchText: string
  /** The search box once typing paused, trimmed: what the API is asked for. */
  search: string
}

export type ActivityFiltersControl = {
  filters: ActivityFilters
  setDays: (days: number) => void
  setKind: (kind: KindFilter) => void
  setSearchText: (text: string) => void
  /** Searches for an address at once, optionally narrowing to one kind of event. */
  showAddress: (address: string, kind?: KindFilter) => void
  clear: () => void
}

/** The log's filters, shared by the page's header, the address tables and the log itself. */
export function useActivityFilters(initialDays?: number): ActivityFiltersControl {
  const [days, setDays] = useState(initialDays)
  const [kind, setKind] = useState<KindFilter>('all')
  const [searchText, setSearchText] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchText.trim()), SEARCH_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [searchText])

  function showAddress(address: string, nextKind?: KindFilter): void {
    setSearchText(address)
    setSearch(address)
    setKind(nextKind ?? kind)
  }

  function clear(): void {
    setKind('all')
    setSearchText('')
    setSearch('')
  }

  const filters = { days, kind, searchText, search }

  return { filters, setDays, setKind, setSearchText, showAddress, clear }
}

/** The filters as the API reads them; "all" kinds and an empty search filter nothing. */
export function auditFilterOf(filters: ActivityFilters, userId?: string): AuditFilter {
  return {
    userId,
    days: filters.days,
    kind: apiKindOf(filters.kind),
    search: filters.search || undefined,
  }
}

function apiKindOf(kind: KindFilter): AuditKind | undefined {
  if (kind === 'all') {
    return undefined
  }

  return kind
}

/** Whether the kind or the search narrows the log, so an empty result can offer to undo it. */
export function isNarrowed(filters: ActivityFilters): boolean {
  return filters.kind !== 'all' || filters.search !== ''
}
