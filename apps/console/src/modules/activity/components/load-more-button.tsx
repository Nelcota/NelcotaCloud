import type { JSX } from 'react'

import { PendingButton } from '@/shared/ui/pending-button'

type LoadMoreButtonProps = { hasMore: boolean; isLoading: boolean; onLoad: () => void }

/** The end of the feed: reads the next, older page of events. */
export function LoadMoreButton({
  hasMore,
  isLoading,
  onLoad,
}: LoadMoreButtonProps): JSX.Element | null {
  if (hasMore === false) {
    return null
  }

  return (
    <PendingButton
      type="button"
      variant="ghost"
      className="w-full"
      isPending={isLoading}
      onClick={onLoad}
    >
      Carregar mais
    </PendingButton>
  )
}
