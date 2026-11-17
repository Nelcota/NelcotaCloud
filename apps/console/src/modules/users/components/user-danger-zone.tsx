import type { JSX } from 'react'

import { ConfirmedActionButton } from '@/modules/users/components/confirmed-action-button'
import type { UserActionProps } from '@/modules/users/components/user-account-section'
import { SettingsSection } from '@/shared/ui/settings-section'

export function UserDangerZone({ user, pendingAction, onAction }: UserActionProps): JSX.Element {
  return (
    <SettingsSection title="Zona de perigo" tone="danger">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Excluir este usuário</p>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            Remove a conta, os logins sociais e as sessões.
          </p>
        </div>
        <div className="shrink-0">
          <ConfirmedActionButton
            action="delete"
            email={user.email}
            isPending={pendingAction === 'delete'}
            onConfirm={() => onAction('delete')}
          />
        </div>
      </div>
    </SettingsSection>
  )
}
