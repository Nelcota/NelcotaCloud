/** One query run from this editor: its text and when it ran (ISO date). */
export type SqlHistoryEntry = { sql: string; ranAt: string }

const STORAGE_PREFIX = 'nelcota.sql-history.'

export const MAX_HISTORY_ENTRIES = 10

/** Longer texts are not kept in the history; the editor itself still saves them. */
const MAX_ENTRY_LENGTH = 20_000

export function loadHistory(projectId: string): SqlHistoryEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_PREFIX + projectId)

    if (saved === null) {
      return []
    }

    return parseHistory(JSON.parse(saved))
  } catch {
    return []
  }
}

/** Storage may be full or blocked (private windows); the history then lives in memory only. */
export function saveHistory(projectId: string, entries: readonly SqlHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + projectId, JSON.stringify(entries))
  } catch {
    return
  }
}

/** The new query first; running the same text again moves it up instead of repeating it. */
export function withEntry(entries: readonly SqlHistoryEntry[], sql: string): SqlHistoryEntry[] {
  const text = sql.trim()

  if (text === '' || text.length > MAX_ENTRY_LENGTH) {
    return [...entries]
  }

  const others = entries.filter((entry) => entry.sql !== text)
  const entry = { sql: text, ranAt: new Date().toISOString() }

  return [entry, ...others].slice(0, MAX_HISTORY_ENTRIES)
}

/** Storage is outside the app: keep only well-formed entries. */
function parseHistory(value: unknown): SqlHistoryEntry[] {
  if (Array.isArray(value) === false) {
    return []
  }

  return value.filter(isEntry).slice(0, MAX_HISTORY_ENTRIES)
}

function isEntry(value: unknown): value is SqlHistoryEntry {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate: { sql?: unknown; ranAt?: unknown } = value

  return typeof candidate.sql === 'string' && typeof candidate.ranAt === 'string'
}
