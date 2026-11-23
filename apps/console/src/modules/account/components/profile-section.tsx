import type { Session } from '@nelcota/sdk'
import type { JSX } from 'react'

import { AvatarUploadDialog } from '@/modules/account/components/avatar-upload-dialog'
import { ProfileFacts } from '@/modules/account/components/profile-facts'
import { RemovePhotoButton } from '@/modules/account/components/remove-photo-button'
import {
  useRemoveAvatarMutation,
  useUploadAvatarMutation,
} from '@/modules/account/queries/use-avatar'
import { useCurrentAccount } from '@/shared/auth/use-current-account'
import { Avatar } from '@/shared/ui/avatar'
import { SettingsSection } from '@/shared/ui/settings-section'
import { StatusBadge } from '@/shared/ui/status-badge'

const PHOTO_COPY = {
  title: 'Foto de perfil',
  description: 'Arraste para enquadrar a foto.',
  saveLabel: 'Salvar foto',
}

/** Who the console account is: photo, email and its state, then its technical facts. */
export function ProfileSection({ session }: { session: Session }): JSX.Element {
  const { user } = session
  const { photoUrl } = useCurrentAccount()
  const removal = useRemoveAvatarMutation()
  const upload = useUploadAvatarMutation()

  return (
    <SettingsSection title="Perfil">
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface p-3">
        <Avatar src={photoUrl ?? undefined} name={user.email} size="lg" />
        <div className="grid min-w-0 flex-1 basis-48 gap-1">
          <p className="truncate text-sm font-medium text-heading">{user.email}</p>
          <div className="flex flex-wrap items-center gap-2">
            <VerificationBadge verifiedAt={user.email_verified_at ?? null} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RemovePhotoButton
            hasPhoto={photoUrl !== null}
            isPending={removal.isPending}
            onConfirm={() => removal.mutateAsync()}
          />
          <AvatarUploadDialog
            copy={{ ...PHOTO_COPY, triggerLabel: uploadLabel(photoUrl) }}
            cropShape="round"
            upload={upload}
          />
        </div>
      </div>
      <ProfileFacts user={user} />
    </SettingsSection>
  )
}

function VerificationBadge({ verifiedAt }: { verifiedAt: string | null }): JSX.Element {
  if (verifiedAt === null) {
    return <StatusBadge tone="warning">Email não confirmado</StatusBadge>
  }

  return <StatusBadge tone="success">Email confirmado</StatusBadge>
}

function uploadLabel(photoUrl: string | null): string {
  if (photoUrl === null) {
    return 'Enviar foto'
  }

  return 'Trocar foto'
}
