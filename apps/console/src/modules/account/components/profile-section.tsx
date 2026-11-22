import type { Session } from '@nelcota/sdk'
import type { JSX } from 'react'

import { AvatarUploadDialog } from '@/modules/account/components/avatar-upload-dialog'
import { ProfileFacts } from '@/modules/account/components/profile-facts'
import { RemovePhotoButton } from '@/modules/account/components/remove-photo-button'
import { useRemoveAvatarMutation } from '@/modules/account/queries/use-avatar'
import { useCurrentAccount } from '@/shared/auth/use-current-account'
import { Avatar } from '@/shared/ui/avatar'
import { StatusBadge } from '@/shared/ui/status-badge'

/** Who the console account is: photo, email and its state, then its technical facts. */
export function ProfileSection({ session }: { session: Session }): JSX.Element {
  const { user } = session
  const { photoUrl } = useCurrentAccount()
  const removal = useRemoveAvatarMutation()

  return (
    <section aria-label="Perfil" className="min-w-0 overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-5 p-6">
        <Avatar src={photoUrl ?? undefined} name={user.email} size="xl" />
        <div className="grid min-w-0 flex-1 basis-56 gap-1.5">
          <p className="truncate text-xl font-semibold tracking-tight text-heading">{user.email}</p>
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
          <AvatarUploadDialog triggerLabel={uploadLabel(photoUrl)} />
        </div>
      </div>
      <ProfileFacts user={user} />
    </section>
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
