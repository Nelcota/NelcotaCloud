import type { User } from '@nelcota/sdk'

import { nelcota } from '@/shared/auth/nelcota'

export function verifyEmail(token: string): Promise<User> {
  return nelcota.auth.verifyEmail({ token })
}
