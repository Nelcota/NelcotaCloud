import type { SignInResult } from '@nelcota/sdk'

import type { Credentials } from '@/modules/account/api/credentials'
import { nelcota } from '@/shared/auth/nelcota'

export function signIn(credentials: Credentials): Promise<SignInResult> {
  return nelcota.auth.signInWithPassword(credentials)
}
