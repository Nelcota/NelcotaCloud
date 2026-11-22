/** Every key the SQL editor writes: the draft and the history, one of each per project. */
const SQL_STORAGE_PREFIXES = ['nelcota.sql-editor.', 'nelcota.sql-history.']

/**
 * Removes the SQL drafts and history of every project from this browser, so the next account
 * signed in here never reads the queries of the previous one.
 */
export function forgetSqlDrafts(): void {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
    keys.filter(isSqlKey).forEach((key) => localStorage.removeItem(key))
  } catch {
    // Storage blocked (private window): there is nothing stored to forget.
  }
}

function isSqlKey(key: string | null): key is string {
  return key !== null && SQL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
}
