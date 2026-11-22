import type { JSX } from 'react'
import { useEffect, useRef } from 'react'

import { ErrorAlert } from '@/shared/ui/error-alert'

/** A failure at the end of a long step: scrolled into view and focused, so it is seen and read. */
export function FocusedError({ error }: { error: unknown }): JSX.Element | null {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = container.current

    if (error === null || element === null) {
      return
    }

    element.scrollIntoView({ block: 'nearest' })
    element.focus({ preventScroll: true })
  }, [error])

  if (error === null || error === undefined) {
    return null
  }

  return (
    <div ref={container} tabIndex={-1} className="outline-none">
      <ErrorAlert error={error} />
    </div>
  )
}
