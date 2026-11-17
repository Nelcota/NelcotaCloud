import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/shared/api/api-error'

/** A refusal (4xx) answers the same the second time; only network and server failures retry. */
const MAX_RETRIES = 1
const FIRST_SERVER_ERROR = 500

function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < FIRST_SERVER_ERROR) {
    return false
  }

  return failureCount < MAX_RETRIES
}

/** One cache for the whole console. */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: shouldRetry } },
})
