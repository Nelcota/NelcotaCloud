import { type QueryCache, useQueryClient } from '@tanstack/react-query'
import { useCallback, useSyncExternalStore } from 'react'

import { ApiError } from '@/shared/api/api-error'

const EMAIL_NOT_VERIFIED = 'email_not_verified'

/**
 * Whether the API refused a request because the account's email is unconfirmed. Only the API
 * knows if the platform requires it (an instance without an email provider may not).
 *
 * Only queries a page still shows count: an old refusal left in the cache by a page closed
 * since would keep the banner up after the email was confirmed.
 */
export function useEmailVerificationRequired(): boolean {
  const queryCache = useQueryClient().getQueryCache()
  const subscribe = useCallback(
    (onChange: () => void) => queryCache.subscribe(onChange),
    [queryCache],
  )

  return useSyncExternalStore(subscribe, () => isAnyShownQueryRefused(queryCache))
}

function isAnyShownQueryRefused(queryCache: QueryCache): boolean {
  return queryCache
    .getAll()
    .some((query) => query.getObserversCount() > 0 && isEmailNotVerified(query.state.error))
}

function isEmailNotVerified(error: unknown): boolean {
  return error instanceof ApiError && error.code === EMAIL_NOT_VERIFIED
}
