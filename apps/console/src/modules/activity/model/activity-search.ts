// Relative, with its extension: the model tests run in Node, which knows no `@/` alias.
import {
  type ActivityPeriod,
  DEFAULT_PERIOD,
  PRESETS,
  type PresetDays,
  dayRangeOf,
  isDayRange,
} from './activity-period.ts'
import type { operations } from '@/shared/api/api-schema'

export type AuditKind = NonNullable<
  NonNullable<operations['list_audit_events']['parameters']['query']>['kind']
>

/** The page's filter: a period, one kind of event or all of them, and a search by email or IP. */
export type ActivityFilter = { period: ActivityPeriod; kind: AuditKind | 'all'; search: string }

/**
 * The URL keeps the filter, in Portuguese since people see and share it: a preset as
 * `periodo`, or calendar days as `de` and `ate`.
 */
export type ActivitySearch = {
  periodo?: string
  de?: string
  ate?: string
  tipo?: string
  busca?: string
}

/** The URL word for each period and each kind. */
const PERIOD_WORDS: Record<PresetDays, string> = { 1: '24h', 7: '7d', 30: '30d', 90: '90d' }
const KIND_WORDS: Record<AuditKind, string> = {
  logins: 'logins',
  failures: 'recusados',
  changes: 'alteracoes',
  security: 'seguranca',
  account: 'conta',
  project: 'projeto',
}

const KINDS: readonly AuditKind[] = [
  'logins',
  'failures',
  'security',
  'account',
  'changes',
  'project',
]
/** The longest search the API accepts: the longest email address. */
const MAX_SEARCH_LENGTH = 254

/** Keeps only the values the page understands; anything else in the URL is dropped. */
export function parseActivitySearch(search: Record<string, unknown>): ActivitySearch {
  const kind = kindFromWord(search.tipo)
  const text = search.busca
  const parsed: ActivitySearch = periodSearch(periodFromSearch(search))

  if (kind !== undefined) {
    parsed.tipo = KIND_WORDS[kind]
  }

  if (typeof text === 'string' && text !== '' && text.length <= MAX_SEARCH_LENGTH) {
    parsed.busca = text
  }

  return parsed
}

export function activityFilterOf(search: ActivitySearch): ActivityFilter {
  return {
    period: periodFromSearch(search),
    kind: kindFromWord(search.tipo) ?? 'all',
    search: search.busca ?? '',
  }
}

/** The URL for a filter; the defaults are left out so the plain page keeps a clean address. */
export function searchForFilter(filter: ActivityFilter): ActivitySearch {
  const search = periodSearch(filter.period)

  if (filter.kind !== 'all') {
    search.tipo = KIND_WORDS[filter.kind]
  }

  if (filter.search !== '') {
    search.busca = filter.search.slice(0, MAX_SEARCH_LENGTH)
  }

  return search
}

/** Calendar days win over a preset; an invalid range falls back to the preset or the default. */
function periodFromSearch(search: Record<string, unknown>): ActivityPeriod {
  const range = dayRangeOf(search.de, search.ate)

  if (range !== undefined) {
    return range
  }

  return PRESETS.find((days) => PERIOD_WORDS[days] === search.periodo) ?? DEFAULT_PERIOD
}

function periodSearch(period: ActivityPeriod): ActivitySearch {
  if (isDayRange(period)) {
    return { de: period.from, ate: period.to }
  }

  if (period === DEFAULT_PERIOD) {
    return {}
  }

  return { periodo: PERIOD_WORDS[period] }
}

function kindFromWord(word: unknown): AuditKind | undefined {
  return KINDS.find((kind) => KIND_WORDS[kind] === word)
}
