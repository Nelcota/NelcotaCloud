import type { User } from '@nelcota/sdk'
import type { JSX } from 'react'

import { nelcota } from '../lib/nelcota'

type UserAvatarProps = { user: User }

/** The profile photo, or the email's first letter when there is none. */
export function UserAvatar({ user }: UserAvatarProps): JSX.Element {
  const photoUrl = nelcota.auth.avatar.url(user)

  if (photoUrl === null) {
    return (
      <span className="avatar" aria-hidden="true">
        {user.email.slice(0, 1).toUpperCase()}
      </span>
    )
  }

  return <img className="avatar" src={photoUrl} alt="" />
}
