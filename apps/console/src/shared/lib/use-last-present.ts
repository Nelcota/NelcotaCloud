import { useState } from 'react'

/**
 * The value, or the last one that was not `null`: a dialog closed by clearing what it was about
 * keeps showing it while it animates out.
 */
export function useLastPresent<T>(value: T | null): T | null {
  const [last, setLast] = useState(value)

  if (value !== null && value !== last) {
    setLast(value)
  }

  return value ?? last
}
