import { nelcota } from '@/shared/auth/nelcota'

export type PasswordReset = { token: string; password: string }

/** Sets a new password from the reset link; every session of the account ends. */
export function resetPassword(reset: PasswordReset): Promise<void> {
  return nelcota.auth.resetPassword(reset)
}
