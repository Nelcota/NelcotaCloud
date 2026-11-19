import type { UserStatus, UserStatusFilter } from './user-status-filter.ts'

/** The list's order: newest accounts first (the default) or most recent login first. */
export type UserOrder = 'created_at' | 'last_sign_in'

/**
 * What the list shows: a search by email, a status (or everyone), and the page, as the cursors
 * of the pages before it (newest first), so "Mais novos" can step back one at a time.
 */
export type UsersFilter = {
  search: string
  status: UserStatusFilter
  order: UserOrder
  cursors: readonly string[]
}

/** Cursors are joined by commas in the URL ("paginas=c1,c2"): readable, and a cursor has none. */
const CURSOR_SEPARATOR = ','

/**
 * The URL keeps the filter and the page, so going back from a user lands on the same list and
 * page, and a filtered view can be shared. In Portuguese, since people see the URL.
 */
export type UsersSearch = { busca?: string; situacao?: string; ordem?: string; paginas?: string }

/** Only the non-default order has a word; the newest-first list is the bare page. */
const LAST_SIGN_IN_WORD = 'ultimo-login'

const STATUS_WORDS: Record<UserStatus, string> = {
  unverified: 'nao-confirmados',
  banned: 'bloqueados',
}

/** The longest search the API accepts: the longest email address. */
const MAX_SEARCH_LENGTH = 254
/** Far beyond any real paging, and keeps a hand-edited URL from growing without end. */
const MAX_PAGES = 200
const MAX_CURSOR_LENGTH = 256

/** Keeps only the values the page understands; anything else in the URL is dropped. */
export function parseUsersSearch(search: Record<string, unknown>): UsersSearch {
  const parsed: UsersSearch = {}
  const status = statusFromWord(search.situacao)
  const text = search.busca
  const cursors = cursorsFrom(search.paginas)

  if (status !== undefined) {
    parsed.situacao = STATUS_WORDS[status]
  }

  if (typeof text === 'string' && text.trim() !== '' && text.length <= MAX_SEARCH_LENGTH) {
    parsed.busca = text
  }

  if (search.ordem === LAST_SIGN_IN_WORD) {
    parsed.ordem = LAST_SIGN_IN_WORD
  }

  if (cursors.length > 0) {
    parsed.paginas = cursors.join(CURSOR_SEPARATOR)
  }

  return parsed
}

export function usersFilterOf(search: UsersSearch): UsersFilter {
  return {
    search: search.busca ?? '',
    status: statusFromWord(search.situacao) ?? 'all',
    order: orderFromWord(search.ordem),
    cursors: cursorsFrom(search.paginas),
  }
}

/** The shortest URL for a filter: everyone, no search, first page is the bare page. */
export function searchForUsersFilter(filter: UsersFilter): UsersSearch {
  const search: UsersSearch = {}

  if (filter.status !== 'all') {
    search.situacao = STATUS_WORDS[filter.status]
  }

  if (filter.search.trim() !== '') {
    search.busca = filter.search
  }

  if (filter.order === 'last_sign_in') {
    search.ordem = LAST_SIGN_IN_WORD
  }

  if (filter.cursors.length > 0) {
    search.paginas = filter.cursors.join(CURSOR_SEPARATOR)
  }

  return search
}

/** All the cursors or none: one bad part would page from the wrong place. */
function cursorsFrom(value: unknown): string[] {
  if (typeof value !== 'string' || value === '') {
    return []
  }

  const parts = value.split(CURSOR_SEPARATOR)

  if (parts.length > MAX_PAGES || parts.every(isCursor) === false) {
    return []
  }

  return parts
}

function isCursor(value: string): boolean {
  return value !== '' && value.length <= MAX_CURSOR_LENGTH
}

function statusFromWord(word: unknown): UserStatus | undefined {
  if (word === STATUS_WORDS.unverified) {
    return 'unverified'
  }

  if (word === STATUS_WORDS.banned) {
    return 'banned'
  }

  return undefined
}

function orderFromWord(word: unknown): UserOrder {
  if (word === LAST_SIGN_IN_WORD) {
    return 'last_sign_in'
  }

  return 'created_at'
}
