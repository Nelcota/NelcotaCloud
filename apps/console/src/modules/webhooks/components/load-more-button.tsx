import type { JSX } from 'react'

import { PendingButton } from '@/shared/ui/pending-button'

type LoadMoreButtonProps = { hasMore: boolean; isLoading: boolean; onLoad: () => void }

/** Under the log's rows while older deliveries remain. */
export function LoadMoreButton({
  hasMore,
  isLoading,
  onLoad,
}: LoadMoreButtonProps): JSX.Element | null {
  if (hasMore === false) {
    return null
  }

  return (
    <div className="flex justify-center border-t border-border/70 p-2">
      <PendingButton type="button" variant="ghost" size="sm" isPending={isLoading} onClick={onLoad}>
        Carregar mais antigas
      </PendingButton>
    </div>
  )
}
