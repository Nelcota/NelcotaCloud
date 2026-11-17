import type { SignUpResult } from '@nelcota/sdk'
import { type UseMutationResult, useMutation } from '@tanstack/react-query'

import type { Credentials } from '@/modules/account/api/credentials'
import { signUp } from '@/modules/account/api/sign-up'

export function useSignUpMutation(): UseMutationResult<SignUpResult, Error, Credentials> {
  return useMutation({ mutationFn: signUp })
}
