import { useEffect, useRef } from 'react'

/**
 * Runs `effect` once per mount. One-time tokens (magic links, OAuth codes) fail when redeemed
 * twice, which React's development mode would do by running effects twice.
 */
export function useRunOnce(effect: () => void): void {
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) {
      return
    }

    hasRun.current = true
    effect()
  }, [effect])
}
