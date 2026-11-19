import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'

import { banUser } from '@/modules/users/api/ban-user'
import { deleteUser } from '@/modules/users/api/delete-user'
import { endUserSessions } from '@/modules/users/api/end-user-sessions'
import { resendVerification } from '@/modules/users/api/resend-verification'
import { unbanUser } from '@/modules/users/api/unban-user'
import { usersQueryKey } from '@/modules/users/queries/use-users'
import { auditEventsKey } from '@/shared/lib/audit-events-key'

export type BulkAction = 'resend-verification' | 'unban' | 'end-sessions' | 'ban' | 'delete'

const ACTIONS: Record<BulkAction, (projectId: string, userId: string) => Promise<unknown>> = {
  'resend-verification': resendVerification,
  unban: unbanUser,
  'end-sessions': endUserSessions,
  ban: banUser,
  delete: deleteUser,
}

type BulkRequest = { action: BulkAction; userIds: readonly string[] }

/** Some users of a bulk action failed; the others went through. */
export class BulkActionError extends Error {
  readonly failedIds: readonly string[]
  /** The first failure, which says why (it is usually the same for all). */
  readonly firstCause: unknown

  constructor(failedIds: readonly string[], firstCause: unknown) {
    super('bulk action failed')
    this.failedIds = failedIds
    this.firstCause = firstCause
  }
}

/**
 * Runs one admin action on several users, one request at a time (the API has no bulk route, and
 * one at a time keeps the project's rate limits), then reloads the list once.
 */
export function useBulkUserActionMutation(
  projectId: string,
): UseMutationResult<void, Error, BulkRequest> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ action, userIds }) => {
      const failure = await runEach(userIds, (userId) => ACTIONS[action](projectId, userId))
      await queryClient.invalidateQueries({ queryKey: auditEventsKey(projectId) })
      await queryClient.invalidateQueries({ queryKey: usersQueryKey(projectId) })

      if (failure !== null) {
        throw failure
      }
    },
  })
}

async function runEach(
  userIds: readonly string[],
  run: (userId: string) => Promise<unknown>,
): Promise<BulkActionError | null> {
  const failedIds: string[] = []
  let firstCause: unknown = null

  for (const userId of userIds) {
    try {
      await run(userId)
    } catch (cause) {
      failedIds.push(userId)
      firstCause ??= cause
    }
  }

  if (failedIds.length === 0) {
    return null
  }

  return new BulkActionError(failedIds, firstCause)
}
