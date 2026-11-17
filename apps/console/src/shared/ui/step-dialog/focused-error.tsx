import type { JSX } from 'react'
import { useEffect, useRef } from 'react'

import { ErrorAlert } from '@/shared/ui/error-alert'

/**
 * A failure at the end of a long step: scrolled into view and focused, so it is seen and read
 * rather than left below the fold of the scrolling column.
 */
export function FocusedError({ error }: { error: unknown }): JSX.Element {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = container.current

    if (error === null || element === null) {
      return
    }

    element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    element.focus({ preventScroll: true })
  }, [error])

  return (
    <div ref={container} tabIndex={-1} className="outline-none empty:hidden">
      <ErrorAlert error={error} />
    </div>
  )
}
