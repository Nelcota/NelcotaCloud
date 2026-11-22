import type { JSX } from 'react'

import { UsersPagination } from '@/modules/users/components/users-pagination'
import { USERS_PAGE_SIZE } from '@/modules/users/queries/use-users'

type UsersFooterProps = {
  offset: number
  total: number | undefined
  onOffsetChange: (offset: number) => void
}

/** The table's footer bar: which rows are on screen, and the pages when there is more than one. */
export function UsersFooter({
  offset,
  total,
  onOffsetChange,
}: UsersFooterProps): JSX.Element | null {
  if (total === undefined || (total === 0 && offset === 0)) {
    return null
  }

  // One page needs no bar: the toolbar already counts the users.
  if (offset === 0 && total <= USERS_PAGE_SIZE) {
    return null
  }

  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-3 border-t bg-surface px-4 py-2">
      <span className="text-sm text-muted-foreground tabular-nums">{rangeText(offset, total)}</span>
      <UsersPagination
        offset={offset}
        pageSize={USERS_PAGE_SIZE}
        total={total}
        onOffsetChange={onOffsetChange}
      />
    </div>
  )
}

/** "1–50 de 123"; a page emptied by deletions still says where it is. */
function rangeText(offset: number, total: number): string {
  const first = Math.min(offset + 1, total)
  const last = Math.min(offset + USERS_PAGE_SIZE, total)

  return `${first.toLocaleString('pt-BR')}–${last.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')}`
}
