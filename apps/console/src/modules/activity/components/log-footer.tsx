import type { JSX } from 'react'

import { LoadMoreButton } from '@/modules/activity/components/load-more-button'
import { LIVE_INTERVAL_SECONDS } from '@/modules/activity/components/use-live-refetch'
import { formatCount } from '@/shared/lib/format-number'

type LogFooterProps = {
  lines: { shown: number; loaded: number; isLive: boolean }
  more: { hasMore: boolean; isLoading: boolean; onLoad: () => void }
}

/** Under the lines: how many are on screen, whether they refresh, and the older page. */
export function LogFooter({ lines, more }: LogFooterProps): JSX.Element {
  return (
    <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3 py-1">
      <span className="font-mono text-2xs text-muted-foreground tabular-nums" aria-live="polite">
        {linesText(lines.shown, lines.loaded)} · {refreshText(lines.isLive)}
      </span>
      <LoadMoreButton hasMore={more.hasMore} isLoading={more.isLoading} onLoad={more.onLoad} />
    </div>
  )
}

/** Pages are read by cursor, so the log knows what is loaded, not the total. */
function linesText(shown: number, loaded: number): string {
  if (shown !== loaded) {
    return `${formatCount(shown)} de ${formatCount(loaded)} linhas`
  }

  if (loaded === 1) {
    return '1 linha'
  }

  return `${formatCount(loaded)} linhas`
}

function refreshText(isLive: boolean): string {
  if (isLive) {
    return `atualiza a cada ${LIVE_INTERVAL_SECONDS} s`
  }

  return 'pausado'
}
