import {
  ACTION_LABELS,
  METHOD_LABELS,
  ORIGIN_LABELS,
} from '@/modules/activity/components/audit-labels'
import { levelOf } from '@/modules/activity/components/log-levels'
import type { components } from '@/shared/api/api-schema'

type AuditEvent = components['schemas']['AuditEvent']

export type FacetPick = { value: string; label: string }

/** A field of the log lines that the "Campos detectados" panel counts. */
export type FacetField = {
  field: string
  /** Answered by the API's search (email or IP) instead of over the loaded lines only. */
  isSearched: boolean
  pick: (event: AuditEvent) => FacetPick | null
}

const FIELDS: readonly FacetField[] = [
  { field: 'nível', isSearched: false, pick: (event) => same(levelOf(event.action)) },
  {
    field: 'evento',
    isSearched: false,
    pick: (event) => ({ value: event.action, label: ACTION_LABELS[event.action] }),
  },
  {
    field: 'origem',
    isSearched: false,
    pick: (event) => ({ value: event.actor, label: ORIGIN_LABELS[event.actor] }),
  },
  { field: 'método', isSearched: false, pick: methodPick },
  { field: 'ip', isSearched: true, pick: (event) => textPick(event.ip_address) },
]

const USER_FIELD: FacetField = {
  field: 'usuário',
  isSearched: true,
  pick: (event) => textPick(event.email),
}

/** The fields to count; one user's page leaves the user out, every line is theirs. */
export function facetFieldsFor(showsUser: boolean): readonly FacetField[] {
  if (showsUser) {
    return [...FIELDS, USER_FIELD]
  }

  return FIELDS
}

function methodPick(event: AuditEvent): FacetPick | null {
  const method = event.login_method ?? null

  if (method === null) {
    return null
  }

  return { value: method, label: METHOD_LABELS[method] }
}

function textPick(text: string | null | undefined): FacetPick | null {
  if (text === null || text === undefined || text === '') {
    return null
  }

  return same(text)
}

function same(text: string): FacetPick {
  return { value: text, label: text }
}
