import { useState } from 'react'

import {
  type SqlHistoryEntry,
  loadHistory,
  saveHistory,
  withEntry,
} from '@/modules/sql-editor/components/sql-history'

type SqlHistory = {
  entries: SqlHistoryEntry[]
  record: (sql: string) => void
}

/** The last queries run in this project's editor, kept in this browser. */
export function useSqlHistory(projectId: string): SqlHistory {
  const [entries, setEntries] = useState(() => loadHistory(projectId))

  function record(sql: string): void {
    const next = withEntry(entries, sql)

    setEntries(next)
    saveHistory(projectId, next)
  }

  return { entries, record }
}
