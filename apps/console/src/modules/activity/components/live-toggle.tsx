import type { JSX } from 'react'

import { LIVE_INTERVAL_SECONDS } from '@/modules/activity/components/use-live-refetch'
import { LiveIndicator } from '@/shared/ui/live-indicator'

type LiveToggleProps = { isLive: boolean; onLiveChange: (isLive: boolean) => void }

/** "Ao vivo" / "Pausado": turns the log's automatic refresh on and off. */
export function LiveToggle({ isLive, onLiveChange }: LiveToggleProps): JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={isLive}
      title={toggleTitle(isLive)}
      onClick={() => onLiveChange(isLive === false)}
      className="flex h-6 shrink-0 items-center rounded-md px-2 hover:bg-surface focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span className="sr-only">Atualização automática: </span>
      <LiveIndicator isLive={isLive} />
    </button>
  )
}

function toggleTitle(isLive: boolean): string {
  if (isLive) {
    return 'Pausar a atualização automática'
  }

  return `Atualizar a cada ${LIVE_INTERVAL_SECONDS} s`
}
