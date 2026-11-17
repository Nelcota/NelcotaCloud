import { nelcota } from '@/shared/auth/nelcota'

export function resendVerification(email: string): Promise<void> {
  return nelcota.auth.resendVerification({ email })
}
