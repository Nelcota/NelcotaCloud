import type { operations } from '@/shared/api/api-schema'

export type UserStatus = NonNullable<
  NonNullable<operations['list_users']['parameters']['query']>['status']
>

/** `all` sends no filter. */
export type UserStatusFilter = UserStatus | 'all'
