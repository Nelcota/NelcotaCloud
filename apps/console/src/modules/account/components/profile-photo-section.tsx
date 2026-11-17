import type { Session } from '@nelcota/sdk'
import type { JSX } from 'react'

import { AvatarUploadDialog } from '@/modules/account/components/avatar-upload-dialog'
import { useRemoveAvatarMutation } from '@/modules/account/queries/use-avatar'
import { useCurrentAccount } from '@/shared/auth/use-current-account'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { SettingsSection } from '@/shared/ui/settings-section'
import { UserAvatar } from '@/shared/ui/user-avatar'

/** The console account's photo, shown in the account menu. */
export function ProfilePhotoSection({ session }: { session: Session }): JSX.Element {
  const user = session.user
  const { photoUrl } = useCurrentAccount()
  const removal = useRemoveAvatarMutation()

  return (
    <SettingsSection title="Foto de perfil" description="Aparece no menu da sua conta.">
      <div className="flex flex-wrap items-center gap-5">
        <UserAvatar email={user.email} photoUrl={photoUrl} className="size-20 text-2xl" />
        <div className="flex flex-wrap gap-2">
          <AvatarUploadDialog triggerLabel={uploadLabel(photoUrl)} />
          <RemovePhotoButton
            hasPhoto={photoUrl !== null}
            isPending={removal.isPending}
            onConfirm={() => removal.mutateAsync()}
          />
        </div>
      </div>
    </SettingsSection>
  )
}

function uploadLabel(photoUrl: string | null): string {
  if (photoUrl === null) {
    return 'Enviar foto'
  }

  return 'Trocar foto'
}

type RemovePhotoButtonProps = {
  hasPhoto: boolean
  isPending: boolean
  onConfirm: () => Promise<void>
}

function RemovePhotoButton(props: RemovePhotoButtonProps): JSX.Element | null {
  if (props.hasPhoto === false) {
    return null
  }

  return (
    <ConfirmButton
      title="Remover foto de perfil?"
      description="Suas iniciais voltam a aparecer no lugar da foto."
      confirmLabel="Remover"
      isDestructive
      isPending={props.isPending}
      onConfirm={props.onConfirm}
    >
      Remover
    </ConfirmButton>
  )
}
