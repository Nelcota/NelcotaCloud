import type { User } from '@nelcota/sdk'
import type { ChangeEvent, JSX } from 'react'

import { nelcota } from '../lib/nelcota'
import { useAction } from '../lib/use-action'
import { Card } from './card'
import { FormFeedback } from './form-feedback'
import { UserAvatar } from './user-avatar'

type AvatarSectionProps = { user: User }

const ACCEPTED_IMAGES = 'image/png,image/jpeg,image/webp'

export function AvatarSection({ user }: AvatarSectionProps): JSX.Element {
  const { isPending, error, run } = useAction()

  function upload(event: ChangeEvent<HTMLInputElement>): void {
    const input = event.target
    const file = input.files?.item(0) ?? null
    input.value = ''

    if (file === null) {
      return
    }

    // The server crops to a centered square; a real app lets the user pick the crop first.
    void run(async () => {
      await nelcota.auth.avatar.upload(file)
    })
  }

  function remove(): void {
    void run(() => nelcota.auth.avatar.remove())
  }

  return (
    <Card title="Foto de perfil">
      <div className="row">
        <UserAvatar user={user} />
        <label className="button secondary" aria-disabled={isPending}>
          Escolher foto
          <input
            type="file"
            accept={ACCEPTED_IMAGES}
            hidden
            disabled={isPending}
            onChange={upload}
          />
        </label>
        <RemovePhotoButton user={user} isPending={isPending} onRemove={remove} />
      </div>
      <FormFeedback error={error} />
    </Card>
  )
}

type RemovePhotoButtonProps = { user: User; isPending: boolean; onRemove: () => void }

function RemovePhotoButton({
  user,
  isPending,
  onRemove,
}: RemovePhotoButtonProps): JSX.Element | null {
  const photoUrl = nelcota.auth.avatar.url(user)

  if (photoUrl === null) {
    return null
  }

  return (
    <button className="secondary" disabled={isPending} onClick={onRemove}>
      Remover
    </button>
  )
}
