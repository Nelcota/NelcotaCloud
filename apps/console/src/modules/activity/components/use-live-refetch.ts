import { useEffect } from 'react'

/** Often enough to watch logins arrive, rare enough to stay light on the API. */
export const LIVE_INTERVAL_SECONDS = 10

type Refetch = (options: { cancelRefetch: boolean }) => Promise<unknown>

/** Reads the log again on an interval while live and the tab is visible. */
export function useLiveRefetch(refetch: Refetch, isLive: boolean): void {
  useEffect(() => {
    if (isLive === false) {
      return
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return
      }

      // Never cancels a page being loaded ("Carregar mais"); a fetch in flight is reused.
      void refetch({ cancelRefetch: false })
    }, LIVE_INTERVAL_SECONDS * 1000)

    return () => window.clearInterval(timer)
  }, [refetch, isLive])
}
