import type { SignInResult } from '@nelcota/sdk'
import { type UseMutationResult, useMutation } from '@tanstack/react-query'

import type { Credentials } from '@/modules/account/api/credentials'
import { signIn } from '@/modules/account/api/sign-in'

export function useSignInMutation(): UseMutationResult<SignInResult, Error, Credentials> {
  return useMutation({ mutationFn: signIn })
}
