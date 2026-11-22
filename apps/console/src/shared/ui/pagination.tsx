import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { JSX } from 'react'

import { Button } from '@/shared/ui/primitives/button'

export function Pagination({
  page,
  totalPages,
  hasMore,
  onChange,
  label,
  isDisabled,
}: {
  page: number
  totalPages?: number
  pageSize?: number
  hasMore?: boolean
  onChange: (next: number) => void
  label: string
  isDisabled?: boolean
  size?: 'sm'
  variant?: 'none'
}): JSX.Element {
  const canAdvance = totalPages === undefined ? hasMore : page < totalPages

  return (
    <nav aria-label={label} className="flex items-center justify-end gap-2 text-xs">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Página anterior"
        disabled={isDisabled || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft aria-hidden />
      </Button>
      <span className="px-1 text-muted-foreground tabular-nums" aria-live="polite">
        Página {page}
        {totalPages === undefined ? '' : ` de ${totalPages}`}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Próxima página"
        disabled={isDisabled || !canAdvance}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight aria-hidden />
      </Button>
    </nav>
  )
}
