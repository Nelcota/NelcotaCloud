import type { JSX } from 'react'
import { useState } from 'react'

import { nameOf } from '@/shared/lib/account-name'
import { cn } from '@/shared/lib/class-names'

type UserAvatarProps = {
  email: string
  /** The profile photo; the initials of the email are shown without one. */
  photoUrl: string | null
  className: string
  /** Blue marks the signed-in account; people in lists stay neutral so blue keeps its meaning. */
  tone?: 'accent' | 'neutral'
}

/** A round avatar: the account's photo, or its initials. Decorative: the email is shown beside it. */
export function UserAvatar({ email, photoUrl, className, tone }: UserAvatarProps): JSX.Element {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const classes = cn('flex shrink-0 overflow-hidden rounded-full', className)

  if (photoUrl === null || photoUrl === failedUrl) {
    return (
      <span
        aria-hidden="true"
        className={cn(classes, 'items-center justify-center font-semibold', initialsTone(tone))}
      >
        {initialsOf(email)}
      </span>
    )
  }

  return (
    <img
      src={photoUrl}
      alt=""
      className={cn(classes, 'bg-muted object-cover')}
      onError={() => setFailedUrl(photoUrl)}
    />
  )
}

function initialsOf(email: string): string {
  return nameOf(email).slice(0, 2).toUpperCase()
}

function initialsTone(tone: UserAvatarProps['tone']): string {
  if (tone === 'neutral') {
    return 'bg-secondary text-secondary-foreground'
  }

  return 'bg-primary text-primary-foreground'
}
