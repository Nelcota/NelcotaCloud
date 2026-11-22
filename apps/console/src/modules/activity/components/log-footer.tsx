import type { JSX } from 'react'

import { LoadMoreButton } from '@/modules/activity/components/load-more-button'
import { LIVE_INTERVAL_SECONDS } from '@/modules/activity/components/use-live-refetch'
import { formatCount } from '@/shared/lib/format-number'

type LogFooterProps = {
  loaded: number
  isLive: boolean
  more: { hasMore: boolean; isLoading: boolean; onLoad: () => void }
}

/** Under the events: how many are on screen, whether they refresh, and the older page. */
export function LogFooter({ loaded, isLive, more }: LogFooterProps): JSX.Element {
  return (
    <div className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3 py-1">
      <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
        {eventsText(loaded)} · {refreshText(isLive)}
      </span>
      <LoadMoreButton hasMore={more.hasMore} isLoading={more.isLoading} onLoad={more.onLoad} />
    </div>
  )
}

/** Pages are read by cursor, so the feed knows what is loaded, not the total. */
function eventsText(loaded: number): string {
  if (loaded === 1) {
    return '1 evento carregado'
  }

  return `${formatCount(loaded)} eventos carregados`
}

function refreshText(isLive: boolean): string {
  if (isLive) {
    return `atualiza a cada ${LIVE_INTERVAL_SECONDS} s`
  }

  return 'pausado'
}
