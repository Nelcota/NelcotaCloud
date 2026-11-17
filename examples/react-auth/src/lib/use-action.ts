import { useCallback, useState } from 'react'

import { describeError } from './describe-error'

export type Action = {
  isPending: boolean
  error: string | null
  run: (action: () => Promise<void>) => Promise<void>
}

/** Runs one async call at a time and keeps its error to show next to the form. */
export function useAction(): Action {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (action: () => Promise<void>): Promise<void> => {
    setIsPending(true)
    setError(null)

    try {
      await action()
    } catch (caught) {
      setError(describeError(caught))
    } finally {
      setIsPending(false)
    }
  }, [])

  return { isPending, error, run }
}
