import type { UserAction } from '@/modules/users/queries/use-users'

/** Confirmed actions show their failure inside the dialog; these two have none. */
export function unconfirmedError(error: Error | null, kind: UserAction | undefined): Error | null {
  if (kind === 'unban' || kind === 'resend-verification') {
    return error
  }

  return null
}
