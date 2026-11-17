import { useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

import { ApiError } from '@/shared/api/api-error'

const EMAIL_NOT_VERIFIED = 'email_not_verified'

/**
 * Whether the API refused a request because the account's email is unconfirmed. Only the API
 * knows if the platform requires it (an instance without an email provider may not).
 */
export function useEmailVerificationRequired(): boolean {
  const queryCache = useQueryClient().getQueryCache()

  return useSyncExternalStore(
    (onChange) => queryCache.subscribe(onChange),
    () => queryCache.getAll().some((query) => isEmailNotVerified(query.state.error)),
  )
}

function isEmailNotVerified(error: unknown): boolean {
  return error instanceof ApiError && error.code === EMAIL_NOT_VERIFIED
}
