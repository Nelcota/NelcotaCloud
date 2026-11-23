import type { JSX } from 'react'

import { Pagination } from '@/shared/ui/pagination'

type RowsPaginationProps = {
  offset: number
  pageSize: number
  /** Rows on the current page. */
  shown: number
  /** `null` when the API did not count them. */
  total: number | null
  /** An estimate only rules nothing out: a full page may still have more after it. */
  isTotalEstimated: boolean
  /** The next page is loading: the controls wait so a double click never skips a page. */
  isChangingPage: boolean
  onOffsetChange: (offset: number) => void
}

/** The grid's footer bar: which slice of the rows is on screen, and the way to the others. */
export function RowsPagination(props: RowsPaginationProps): JSX.Element {
  const { offset, shown } = props
  const lastShown = offset + shown

  return (
    <div className="flex min-h-10 flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-surface px-4 py-1">
      <span className="text-xs text-muted-foreground tabular-nums">
        <RangeLabel offset={offset} lastShown={lastShown} />
        <TotalLabel total={props.total} />
        <span> · o console vê todas as linhas, sem aplicar as políticas</span>
      </span>
      <PageControls {...props} />
    </div>
  )
}

function RangeLabel({ offset, lastShown }: { offset: number; lastShown: number }): JSX.Element {
  if (lastShown === offset) {
    return <>Nenhuma linha nesta página</>
  }

  return (
    <>
      Linhas {(offset + 1).toLocaleString('pt-BR')}–{lastShown.toLocaleString('pt-BR')}
    </>
  )
}

function TotalLabel({ total }: { total: number | null }): JSX.Element | null {
  if (total === null) {
    return null
  }

  return <> de {total.toLocaleString('pt-BR')}</>
}

function PageControls(props: RowsPaginationProps): JSX.Element | null {
  const { offset, pageSize } = props

  if (offset === 0 && props.shown < pageSize) {
    return null
  }

  return (
    <Pagination
      label="Páginas de linhas"
      page={Math.floor(offset / pageSize) + 1}
      hasMore={hasMore(props)}
      isDisabled={props.isChangingPage}
      onChange={(page) => props.onOffsetChange(Math.max(page - 1, 0) * pageSize)}
    />
  )
}

/** Only a full page may have more after it; an exact count can rule it out. */
function hasMore(props: RowsPaginationProps): boolean {
  if (props.shown < props.pageSize) {
    return false
  }

  if (props.total === null || props.isTotalEstimated) {
    return true
  }

  return props.offset + props.shown < props.total
}
