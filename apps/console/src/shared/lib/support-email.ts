const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Where people ask for help (a locked account, a broken page), fixed at build time. Empty when
 * the operator has not set one, so no screen points to a support channel that does not exist.
 */
export const SUPPORT_EMAIL: string = parseSupportEmail(import.meta.env.VITE_SUPPORT_EMAIL ?? '')

function parseSupportEmail(value: string): string {
  const email = value.trim()

  if (EMAIL_SHAPE.test(email) === false) {
    return ''
  }

  return email
}
