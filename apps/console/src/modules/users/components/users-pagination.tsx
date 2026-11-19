import ChevronLeft from '~icons/solar/alt-arrow-left-linear'
import ChevronRight from '~icons/solar/alt-arrow-right-linear'
import type { JSX } from 'react'

import { USERS_PAGE_SIZE } from '@/modules/users/queries/use-users'
import { Button } from '@/shared/ui/button'

type UsersPaginationProps = {
  page: number
  /** Rows on this page; nothing to count or page through without any. */
  shownCount: number
  /** Users matching the search and status; unknown until its count loads. */
  total: number | undefined
  hasNext: boolean
  isPending: boolean
  onPrevious: () => void
  onNext: () => void
}

/** The table card's last row: as tall as a row, split from them by a hairline. */
const FOOTER_CLASS = 'flex min-h-12 flex-wrap items-center gap-1 border-t px-4 py-1.5'

/**
 * Which slice of the users is on screen ("1–50 de 64"), announced as the list changes, and the
 * way to the newer or older ones when there is more than one page.
 */
export function UsersPagination(props: UsersPaginationProps): JSX.Element | null {
  const { page, shownCount, hasNext, isPending } = props

  if (shownCount === 0) {
    return null
  }

  function showPrevious(): void {
    if (page > 1 && isPending === false) {
      props.onPrevious()
    }
  }

  function showNext(): void {
    if (hasNext && isPending === false) {
      props.onNext()
    }
  }

  if (page === 1 && hasNext === false) {
    return (
      <div className={FOOTER_CLASS}>
        <RangeText text={countText(shownCount)} isPending={isPending} />
      </div>
    )
  }

  return (
    <nav aria-label="Páginas de usuários" className={FOOTER_CLASS}>
      <RangeText text={rangeText(props)} isPending={isPending} />
      <Button
        variant="ghost"
        size="sm"
        className="aria-disabled:opacity-50"
        aria-disabled={page === 1 || isPending}
        aria-busy={isPending}
        onClick={showPrevious}
      >
        <ChevronLeft />
        Mais novos
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="aria-disabled:opacity-50"
        aria-disabled={hasNext === false || isPending}
        aria-busy={isPending}
        onClick={showNext}
      >
        Mais antigos
        <ChevronRight />
      </Button>
    </nav>
  )
}

function RangeText({ text, isPending }: { text: string; isPending: boolean }): JSX.Element {
  return (
    <p
      role="status"
      aria-busy={isPending}
      className="text-muted-foreground mr-auto text-sm tabular-nums"
    >
      {text}
    </p>
  )
}

function countText(count: number): string {
  if (count === 1) {
    return '1 usuário'
  }

  return `${count.toLocaleString('pt-BR')} usuários`
}

function rangeText({ page, shownCount, total }: UsersPaginationProps): string {
  const first = (page - 1) * USERS_PAGE_SIZE + 1
  const last = first + shownCount - 1
  const range = `${first.toLocaleString('pt-BR')}–${last.toLocaleString('pt-BR')}`

  if (total === undefined) {
    return range
  }

  return `${range} de ${total.toLocaleString('pt-BR')}`
}
