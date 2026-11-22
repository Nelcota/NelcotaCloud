import type { JSX } from 'react'

import { ApiError } from '@/shared/api/api-error'
import { describeError } from '@/shared/api/describe-error'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { Notice } from '@/shared/ui/notice'

const TOO_MANY_REQUESTS = 429

/** A refused manual send: a rate limit is a wait, not a failure, so it warns instead. */
export function RequestErrorNotice({ error }: { error: unknown }): JSX.Element | null {
  if (error instanceof ApiError && error.status === TOO_MANY_REQUESTS) {
    return <Notice tone="warning" title={describeError(error)} />
  }

  return <ErrorAlert error={error} />
}
