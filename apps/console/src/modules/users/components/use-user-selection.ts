import { useState } from 'react'

import type { CheckState } from '@/shared/ui/checkbox'

export type UserSelection = {
  /** Ids picked among the rows on screen; a new page or filter starts empty. */
  selectedIds: ReadonlySet<string>
  headerState: CheckState
  toggle: (userId: string, isChecked: boolean) => void
  toggleAll: (isChecked: boolean) => void
  /** Keeps only these ids (the users whose bulk action failed, to retry them). */
  keepOnly: (userIds: readonly string[]) => void
  clear: () => void
}

/** Which of the visible users are picked for a bulk action. */
export function useUserSelection(visibleIds: readonly string[]): UserSelection {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  // Rows that left the screen (another page, a filter, a deletion) leave the selection too.
  const selectedIds = new Set(visibleIds.filter((userId) => picked.has(userId)))

  function toggle(userId: string, isChecked: boolean): void {
    const next = new Set(selectedIds)

    if (isChecked) {
      next.add(userId)
    }

    if (isChecked === false) {
      next.delete(userId)
    }

    setPicked(next)
  }

  function toggleAll(isChecked: boolean): void {
    if (isChecked) {
      setPicked(new Set(visibleIds))
      return
    }

    setPicked(new Set())
  }

  return {
    selectedIds,
    headerState: headerStateOf(selectedIds.size, visibleIds.length),
    toggle,
    toggleAll,
    keepOnly: (userIds) => setPicked(new Set(userIds)),
    clear: () => setPicked(new Set()),
  }
}

function headerStateOf(selectedCount: number, visibleCount: number): CheckState {
  if (selectedCount === 0) {
    return 'unchecked'
  }

  if (selectedCount === visibleCount) {
    return 'checked'
  }

  return 'mixed'
}
