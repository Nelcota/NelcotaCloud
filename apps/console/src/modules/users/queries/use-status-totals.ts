import { useUsersQuery } from '@/modules/users/queries/use-users'

export type StatusTotals = {
  all: number | undefined
  unverified: number | undefined
  banned: number | undefined
}

/** How many users the project has in all, unconfirmed and blocked: one-row pages, read for their total. */
export function useStatusTotals(projectId: string): StatusTotals {
  const all = useUsersQuery(projectId, { email: '', status: 'all', offset: 0, limit: 1 })
  const unverified = useUsersQuery(projectId, {
    email: '',
    status: 'unverified',
    offset: 0,
    limit: 1,
  })
  const banned = useUsersQuery(projectId, { email: '', status: 'banned', offset: 0, limit: 1 })

  return { all: all.data?.total, unverified: unverified.data?.total, banned: banned.data?.total }
}
