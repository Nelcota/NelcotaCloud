import type { SignUpResult } from '@nelcota/sdk'

import type { Credentials } from '@/modules/account/api/credentials'
import { nelcota } from '@/shared/auth/nelcota'

export function signUp(credentials: Credentials): Promise<SignUpResult> {
  return nelcota.auth.signUp(credentials)
}
