import type { JSX } from 'react'

import type { RowsPage } from '@/modules/database/api/read-rows'
import { RowsPagination } from '@/modules/database/components/rows-pagination'
import { ROWS_PAGE_SIZE } from '@/modules/database/queries/use-table-rows-query'

type RowsFooterProps = {
  page: RowsPage | undefined
  total: number | null
  isTotalEstimated: boolean
  isChangingPage: boolean
  onOffsetChange: (offset: number) => void
}

/** The pagination bar, once a page of rows is loaded. */
export function RowsFooter({ page, ...rest }: RowsFooterProps): JSX.Element | null {
  if (page === undefined) {
    return null
  }

  return (
    <RowsPagination
      offset={page.offset}
      pageSize={ROWS_PAGE_SIZE}
      shown={page.rows.length}
      {...rest}
    />
  )
}
