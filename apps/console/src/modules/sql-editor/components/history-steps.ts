import type { SqlHistoryEntry } from '@/modules/sql-editor/components/sql-history'

/** Where the box stands in the history: -1 is the user's own text, 0 the newest run, and so on. */
export const DRAFT_POSITION = -1

/**
 * The entry one step back. From the user's own text it skips the newest run when the box
 * already shows it, so the first click always changes what is on screen.
 */
export function olderPosition(
  entries: readonly SqlHistoryEntry[],
  position: number,
  shownSql: string,
): number | null {
  const next = position + 1
  const newest = entries.at(0)
  const target = skipShown(next, position, newest?.sql === shownSql.trim())

  if (entries.at(target) === undefined) {
    return null
  }

  return target
}

function skipShown(next: number, position: number, isNewestShown: boolean): number {
  if (position === DRAFT_POSITION && isNewestShown) {
    return next + 1
  }

  return next
}
