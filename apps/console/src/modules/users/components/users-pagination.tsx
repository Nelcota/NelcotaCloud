import type { JSX } from 'react'

import { Pagination } from '@/shared/ui/pagination'

/** The API's largest `offset`: pages past it cannot be read. */
const MAX_OFFSET = 100_000

type UsersPaginationProps = {
  offset: number
  pageSize: number
  /** `undefined` while the first page loads. */
  total: number | undefined
  onOffsetChange: (offset: number) => void
}

/** The way through the pages of users, newest first. */
export function UsersPagination(props: UsersPaginationProps): JSX.Element | null {
  const { offset, pageSize, total } = props

  if (total === undefined || pageSize <= 0) {
    return null
  }

  // Past the first page it stays, even when deletions shrank the total, so the way back remains.
  if (offset === 0 && total <= pageSize) {
    return null
  }

  const page = Math.floor(offset / pageSize) + 1

  return (
    <Pagination
      label="Páginas de usuários"
      page={page}
      pageSize={pageSize}
      totalPages={pageCount({ page, pageSize, total })}
      onChange={(next) => props.onOffsetChange((next - 1) * pageSize)}
    />
  )
}

type PageCountInput = { page: number; pageSize: number; total: number }

/** Never fewer pages than the one on screen, and none past the API's largest offset. */
function pageCount({ page, pageSize, total }: PageCountInput): number {
  const readablePages = Math.floor(MAX_OFFSET / pageSize) + 1
  const pages = Math.min(Math.ceil(total / pageSize), readablePages)

  return Math.max(pages, page, 1)
}
