import type { JSX } from 'react'

import { Avatar, type AvatarSize } from '@/shared/ui/avatar'

const MINT_OCTOPUS = 24

type ProjectAvatarProps = {
  name: string
  mascotId?: number
  size?: AvatarSize
}

/** A project's mascot, or its initials on a rounded square, so projects are told apart. */
export function ProjectAvatar({ name, mascotId, size = 'sm' }: ProjectAvatarProps): JSX.Element {
  return <Avatar src={mascotSource(mascotId)} name={name} size={size} isSquare />
}

function mascotSource(mascotId: number | undefined): string | undefined {
  if (mascotId === MINT_OCTOPUS) {
    return '/project-mascot-octopus.webp'
  }

  return undefined
}
