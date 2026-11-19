/** The editor's text is kept per project, so a reload or another tab does not lose it. */
const STORAGE_PREFIX = 'nelcota.sql-editor.'

/** Anything longer was not typed in this editor; ignore it rather than load it. */
const MAX_SAVED_LENGTH = 100_000

export const STARTER_QUERY = 'select * from '

export function loadSavedQuery(projectId: string): string {
  try {
    const saved = localStorage.getItem(STORAGE_PREFIX + projectId)

    if (saved === null || saved.length > MAX_SAVED_LENGTH) {
      return STARTER_QUERY
    }

    return saved
  } catch {
    return STARTER_QUERY
  }
}

/** Storage may be full or blocked (private windows); the editor keeps working without it. */
export function saveQuery(projectId: string, query: string): void {
  const key = STORAGE_PREFIX + projectId

  try {
    // Too long to keep: drop the older, shorter text, or a reload would bring it back.
    if (query.length > MAX_SAVED_LENGTH) {
      localStorage.removeItem(key)
      return
    }

    localStorage.setItem(key, query)
  } catch {
    return
  }
}
