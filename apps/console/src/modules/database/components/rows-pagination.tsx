import ChevronLeft from '~icons/solar/alt-arrow-left-linear'
import ChevronRight from '~icons/solar/alt-arrow-right-linear'
import type { JSX } from 'react'

import { Button } from '@/shared/ui/button'

type RowsPaginationProps = {
  offset: number
  pageSize: number
  /** Rows on the current page. */
  shown: number
  /** `null` when the API did not count them. */
  total: number | null
  onOffsetChange: (offset: number) => void
}

/** Which slice of the rows is on screen, and the way to the previous or next one. */
export function RowsPagination(props: RowsPaginationProps): JSX.Element | null {
  const { offset, pageSize, shown, total } = props

  if (offset === 0 && shown < pageSize) {
    return null
  }

  const lastShown = offset + shown

  return (
    <nav aria-label="Páginas de linhas" className="flex items-center justify-end gap-3">
      <p className="text-muted-foreground text-sm">
        {(offset + 1).toLocaleString('pt-BR')}–{lastShown.toLocaleString('pt-BR')}
        <TotalLabel total={total} />
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={offset === 0}
        onClick={() => props.onOffsetChange(Math.max(offset - pageSize, 0))}
      >
        <ChevronLeft />
        Anterior
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={hasMore(lastShown, props) === false}
        onClick={() => props.onOffsetChange(offset + pageSize)}
      >
        Próxima
        <ChevronRight />
      </Button>
    </nav>
  )
}

function TotalLabel({ total }: { total: number | null }): JSX.Element | null {
  if (total === null) {
    return null
  }

  return <> de {total.toLocaleString('pt-BR')}</>
}

/** Only a full page may have more after it; a count (maybe an estimate) can only rule it out. */
function hasMore(lastShown: number, props: RowsPaginationProps): boolean {
  if (props.shown < props.pageSize) {
    return false
  }

  if (props.total === null) {
    return true
  }

  return lastShown < props.total
}
