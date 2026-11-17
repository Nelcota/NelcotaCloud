import { nelcota } from '@/shared/auth/nelcota'

/** Asks for a reset link; the answer is the same whether or not the email has an account. */
export function recoverPassword(email: string): Promise<void> {
  return nelcota.auth.recoverPassword({ email })
}
