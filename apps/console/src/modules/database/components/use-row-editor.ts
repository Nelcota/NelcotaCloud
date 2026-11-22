import { useState } from 'react'

import type { RowsPage } from '@/modules/database/api/read-rows'
import type { RowTarget } from '@/modules/database/components/row-editor-sheet'
import { blankDraft, draftFromRow } from '@/modules/database/components/row-draft'
import { canEditRows, rowKey } from '@/modules/database/components/row-key'
import type { components } from '@/shared/api/api-schema'

type TableOverview = components['schemas']['TableOverview']

export type RowEditor = {
  target: RowTarget | null
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  /** Absent when the table's rows cannot be changed. */
  openNew?: () => void
  openRow?: (index: number) => void
}

/** Which row the editor panel shows, built from the page the grid holds. */
export function useRowEditor(table: TableOverview, page: RowsPage | undefined): RowEditor {
  const [target, setTarget] = useState<RowTarget | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  if (canEditRows(table) === false) {
    return { target, isOpen, setIsOpen }
  }

  function show(next: RowTarget): void {
    setTarget(next)
    setIsOpen(true)
  }

  function openRow(index: number): void {
    const row = page?.rows[index]

    if (row === undefined || page === undefined) {
      return
    }

    const key = rowKey(table, row)

    if (key === null) {
      return
    }

    show({
      kind: 'existing',
      number: page.offset + index + 1,
      key,
      draft: draftFromRow(table.columns, row),
      json: JSON.stringify(row, null, 2),
    })
  }

  return {
    target,
    isOpen,
    setIsOpen,
    openNew: () => show({ kind: 'new', draft: blankDraft(table.columns) }),
    openRow,
  }
}
