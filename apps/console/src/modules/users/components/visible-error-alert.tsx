import type { JSX } from 'react'
import { useEffect, useRef } from 'react'

import { ErrorAlert } from '@/shared/ui/error-alert'

/**
 * An error for an action started far down a long list: it is shown above the list and scrolled
 * into view, so the person who clicked sees it, not only a screen reader.
 */
export function VisibleErrorAlert({ error }: { error: Error | null }): JSX.Element {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (error === null) {
      return
    }

    container.current?.scrollIntoView({ block: 'nearest' })
  }, [error])

  return (
    <div ref={container} className="scroll-mt-4 empty:hidden">
      <ErrorAlert error={error} />
    </div>
  )
}
