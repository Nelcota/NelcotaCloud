import type { UserStatus, UserStatusFilter } from '@/modules/users/model/user-status-filter'

/** A blank search lists everyone. */
export function emailQuery(email: string): { email?: string } {
  const search = email.trim()

  if (search === '') {
    return {}
  }

  return { email: search }
}

export function statusQuery(status: UserStatusFilter): { status?: UserStatus } {
  if (status === 'all') {
    return {}
  }

  return { status }
}
