import { type UseMutationResult, useMutation } from '@tanstack/react-query'

import { type PasswordReset, resetPassword } from '@/modules/account/api/reset-password'

export function useResetPasswordMutation(): UseMutationResult<void, Error, PasswordReset> {
  return useMutation({ mutationFn: resetPassword })
}
