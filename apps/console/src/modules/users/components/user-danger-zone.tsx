import type { JSX } from 'react'

import { ConfirmedActionButton } from '@/modules/users/components/confirmed-action-button'
import type { UserActionProps } from '@/modules/users/components/user-action-props'
import { confirmationSubjectOf } from '@/modules/users/model/account-state'
import { UserSection } from '@/modules/users/components/user-section'

export function UserDangerZone({ user, pendingAction, onAction }: UserActionProps): JSX.Element {
  return (
    <UserSection title="Zona de perigo">
      <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-center @2xl:justify-between">
        <p className="text-muted-foreground text-sm text-pretty">
          Remove a conta, os logins sociais e as sessões. Não dá para desfazer.
        </p>
        <div className="shrink-0">
          <ConfirmedActionButton
            action="delete"
            subject={confirmationSubjectOf(user)}
            isPending={pendingAction === 'delete'}
            onConfirm={() => onAction('delete')}
          />
        </div>
      </div>
    </UserSection>
  )
}
