import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'

import { reloadSession } from '@/modules/account/api/reload-session'
import { resendVerification } from '@/modules/account/api/resend-verification'

export function useResendVerificationMutation(): UseMutationResult<void, Error, string> {
  return useMutation({ mutationFn: resendVerification })
}

/** After the account confirms its email, every request refused for it is worth retrying. */
export function useReloadSessionMutation(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => reloadSession(),
    onSuccess: () => queryClient.invalidateQueries(),
  })
}
