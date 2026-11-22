import { useState } from 'react'

import { DRAFT_POSITION, olderPosition } from '@/modules/sql-editor/components/history-steps'
import type { SqlHistoryEntry } from '@/modules/sql-editor/components/sql-history'

export type HistorySteps = {
  canGoBack: boolean
  canGoForward: boolean
  back: () => void
  forward: () => void
  /** The user typed or picked something: that text is the new starting point. */
  reset: () => void
}

type HistoryStepsInput = {
  entries: readonly SqlHistoryEntry[]
  shownSql: string
  /** Puts a query in the box without counting as the user's own text. */
  show: (sql: string) => void
}

/** Back and forward through the queries run here, like a browser; forward ends at the user's text. */
export function useHistorySteps({ entries, shownSql, show }: HistoryStepsInput): HistorySteps {
  const [position, setPosition] = useState(DRAFT_POSITION)
  const [draft, setDraft] = useState('')
  const older = olderPosition(entries, position, shownSql)

  function back(): void {
    if (older === null) {
      return
    }

    const entry = entries.at(older)

    if (entry === undefined) {
      return
    }

    if (position === DRAFT_POSITION) {
      setDraft(shownSql)
    }

    setPosition(older)
    show(entry.sql)
  }

  function forward(): void {
    const newer = position - 1

    if (position === DRAFT_POSITION) {
      return
    }

    setPosition(newer)
    show(sqlAt(entries, newer) ?? draft)
  }

  return {
    canGoBack: older !== null,
    canGoForward: position !== DRAFT_POSITION,
    back,
    forward,
    reset: () => setPosition(DRAFT_POSITION),
  }
}

/** `at(-1)` would answer the oldest run; the draft position has no entry. */
function sqlAt(entries: readonly SqlHistoryEntry[], position: number): string | undefined {
  if (position === DRAFT_POSITION) {
    return undefined
  }

  return entries.at(position)?.sql
}
