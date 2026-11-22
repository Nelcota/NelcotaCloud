import Trash from '~icons/solar/trash-bin-trash-linear'
import type { JSX } from 'react'

import type { UserActionRunner } from '@/modules/users/components/user-action-runner'
import { UserConfirmButton } from '@/modules/users/components/user-confirm-button'
import type { components } from '@/shared/api/api-schema'
import { SettingsSection } from '@/shared/ui/settings-section'

type User = components['schemas']['User']

type UserDangerZoneProps = { user: User; runner: UserActionRunner }

/** The one action that cannot be undone, set apart at the bottom of the user's page. */
export function UserDangerZone({ user, runner }: UserDangerZoneProps): JSX.Element {
  return (
    <SettingsSection
      title="Excluir usuário"
      description="Remove a conta, as identidades vinculadas e as sessões. Não dá para desfazer."
      isDanger
      footer={
        <UserConfirmButton
          action="delete"
          label="Excluir usuário"
          icon={Trash}
          email={user.email}
          runner={runner}
        />
      }
    />
  )
}
