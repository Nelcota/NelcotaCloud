import type { components } from '@/shared/api/api-schema'

type User = components['schemas']['User']

export type AccountState = 'banned' | 'unverified' | 'active'

/** Blocked wins over an unconfirmed email: a blocked user cannot get in either way. */
export function accountStateOf(user: User): AccountState {
  if (user.banned_at !== null && user.banned_at !== undefined) {
    return 'banned'
  }

  if (user.email_verified_at === null || user.email_verified_at === undefined) {
    return 'unverified'
  }

  return 'active'
}

export const ACCOUNT_STATE_LABELS: Record<AccountState, string> = {
  banned: 'Bloqueado',
  unverified: 'Email não confirmado',
  active: 'Ativo',
}

/** The account as a confirmation names it, so its "from" state matches the page. */
export function confirmationSubjectOf(user: User): { email: string; state: string } {
  return { email: user.email, state: ACCOUNT_STATE_LABELS[accountStateOf(user)] }
}
