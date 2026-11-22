import { useQuery } from '@tanstack/react-query'

import { readDailySignUps } from '@/modules/users/api/read-daily-sign-ups'

/** The window the users page counts new accounts in. */
export const RECENT_SIGN_UP_DAYS = 30

/** Accounts created in the last 30 days and still there; `undefined` while loading or failed. */
export function useRecentSignUps(projectId: string): number | undefined {
  const usage = useQuery({
    // Same key as the overview's daily chart, so both pages share one load.
    queryKey: ['projects', projectId, 'usage', 'daily', RECENT_SIGN_UP_DAYS],
    queryFn: () => readDailySignUps(projectId, RECENT_SIGN_UP_DAYS),
  })
  const days = usage.data?.days

  if (days === undefined) {
    return undefined
  }

  return days.reduce((total, day) => total + day.sign_ups, 0)
}
