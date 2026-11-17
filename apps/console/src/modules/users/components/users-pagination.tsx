import ChevronLeft from '~icons/solar/alt-arrow-left-linear'
import ChevronRight from '~icons/solar/alt-arrow-right-linear'
import type { JSX } from 'react'

import { Button } from '@/shared/ui/button'

/** The API's largest `offset`: pages past it cannot be read. */
const MAX_OFFSET = 100_000

type UsersPaginationProps = {
  offset: number
  pageSize: number
  /** `undefined` while the first page loads. */
  total: number | undefined
  onOffsetChange: (offset: number) => void
}

/** Which slice of the users is on screen, and the way to the newer or older ones. */
export function UsersPagination(props: UsersPaginationProps): JSX.Element | null {
  const { offset, pageSize, total } = props

  if (total === undefined) {
    return null
  }

  // Past the first page it stays, even when deletions shrank the total, so the way back remains.
  if (offset === 0 && total <= pageSize) {
    return null
  }

  const lastShown = Math.min(offset + pageSize, total)
  const nextOffset = offset + pageSize

  return (
    <nav aria-label="Páginas de usuários" className="flex items-center justify-end gap-3">
      <p className="text-muted-foreground text-sm">
        {Math.min(offset + 1, lastShown).toLocaleString('pt-BR')}–
        {lastShown.toLocaleString('pt-BR')} de {total.toLocaleString('pt-BR')}
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={offset === 0}
        onClick={() => props.onOffsetChange(Math.max(offset - pageSize, 0))}
      >
        <ChevronLeft />
        Mais novos
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={lastShown >= total || nextOffset > MAX_OFFSET}
        onClick={() => props.onOffsetChange(nextOffset)}
      >
        Mais antigos
        <ChevronRight />
      </Button>
    </nav>
  )
}
