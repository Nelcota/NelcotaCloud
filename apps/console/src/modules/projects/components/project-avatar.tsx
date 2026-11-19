import type { CSSProperties, JSX } from 'react'

import { AUTOMATIC_MASCOT, projectMascotSelection } from '@/modules/projects/model/project-mascots'
import { cn } from '@/shared/lib/class-names'
import '@/modules/projects/components/project-avatar.css'

const AVATAR_GRID_SIDE = 4
const AVATARS_PER_ATLAS = AVATAR_GRID_SIDE ** 2
const AVATAR_GRID_STEP = 100 / (AVATAR_GRID_SIDE - 1)
const FNV_OFFSET = 2166136261
const FNV_PRIME = 16777619
const FNV_RANGE = 2 ** 32

type ProjectAvatarProps = {
  projectId: string
  mascotId?: number
  className?: string
  /** Placement and size, for mascots laid out freely instead of as tiles. */
  style?: CSSProperties
}

/** The surrounding link or label already identifies the project. */
export function ProjectAvatar(props: ProjectAvatarProps): JSX.Element {
  const { projectId, mascotId, className, style } = props
  const index = avatarIndex(projectId, mascotId)
  const atlasIndex = index % AVATARS_PER_ATLAS
  const column = atlasIndex % AVATAR_GRID_SIDE
  const row = Math.floor(atlasIndex / AVATAR_GRID_SIDE)
  const position = `${column * AVATAR_GRID_STEP}% ${row * AVATAR_GRID_STEP}%`

  return (
    <span
      aria-hidden="true"
      className={cn(
        'project-avatar block size-9 shrink-0',
        index >= AVATARS_PER_ATLAS && 'project-avatar-expanded',
        className,
      )}
      style={{ ...style, backgroundPosition: position }}
    />
  )
}

function avatarIndex(projectId: string, mascotId: number | undefined): number {
  const selection = projectMascotSelection(mascotId)

  if (selection === AUTOMATIC_MASCOT) {
    const hash = hashProjectId(projectId)

    // Adding artwork must not change the automatic mascot of existing projects.
    return Math.floor((hash / FNV_RANGE) * AVATARS_PER_ATLAS)
  }

  return selection - 1
}

function hashProjectId(projectId: string): number {
  let hash = FNV_OFFSET

  for (const character of projectId) {
    hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), FNV_PRIME)
  }

  return hash >>> 0
}
