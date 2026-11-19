import type { UserAction } from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'

type User = components['schemas']['User']

/** What every action control on the user's page needs: the user, what runs, and how to run. */
export type UserActionProps = {
  user: User
  /** The action running on this user, if any. */
  pendingAction: UserAction | null
  onAction: (action: UserAction) => Promise<void>
}
