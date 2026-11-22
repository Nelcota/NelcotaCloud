import Refresh from '~icons/solar/refresh-linear'
import type { JSX } from 'react'

import { InlineCode } from '@/shared/ui/inline-code'
import { PendingButton } from '@/shared/ui/pending-button'

type RowsToolbarProps = { isRefreshing: boolean; onRefresh: () => void }

/** Above the grid: whose eyes the rows are read with, and a way to read them again. */
export function RowsToolbar({ isRefreshing, onRefresh }: RowsToolbarProps): JSX.Element {
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-3 border-b bg-surface px-4 py-1.5">
      <span className="text-xs text-muted-foreground">
        Lidas como <InlineCode>nelcota_service</InlineCode>, sem RLS, pela chave primária
      </span>
      <PendingButton
        type="button"
        variant="ghost"
        size="sm"
        isPending={isRefreshing}
        onClick={onRefresh}
      >
        <Refresh aria-hidden data-icon="inline-start" />
        Atualizar
      </PendingButton>
    </div>
  )
}
