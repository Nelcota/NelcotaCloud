import type { UserAction } from '@/modules/users/queries/use-users'

/** What the user's page hands its sections: the action running now, and the way to run one. */
export type UserActionRunner = {
  pendingAction: UserAction | null
  run: (action: UserAction) => Promise<void>
}
