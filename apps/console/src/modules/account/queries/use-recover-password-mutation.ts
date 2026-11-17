import { type UseMutationResult, useMutation } from '@tanstack/react-query'

import { recoverPassword } from '@/modules/account/api/recover-password'

export function useRecoverPasswordMutation(): UseMutationResult<void, Error, string> {
  return useMutation({ mutationFn: recoverPassword })
}
