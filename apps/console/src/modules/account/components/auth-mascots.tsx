import type { JSX } from 'react'

import { ProjectAvatar } from '@/modules/projects/components/project-avatar'
import '@/modules/account/components/auth-mascots.css'

type FannedMascot = {
  mascotId: number
  /** In px; the 2x artwork is 80px per mascot, so anything above blurs. */
  size: number
  rotate: number
  /** How far above the fan's baseline it sits, so the row bends into an arc. */
  lift: number
}

/** Opened like a hand of cards: the biggest in the middle, the outer ones tilted and lower. */
const FANNED_MASCOTS: readonly FannedMascot[] = [
  { mascotId: 1, size: 52, rotate: -18, lift: 0 },
  { mascotId: 26, size: 64, rotate: -9, lift: 12 },
  { mascotId: 24, size: 80, rotate: 0, lift: 20 },
  { mascotId: 23, size: 64, rotate: 9, lift: 12 },
  { mascotId: 8, size: 52, rotate: 18, lift: 0 },
]

/**
 * The projects' mascots at the top of the login and status pages. They hop in once on load and
 * again when hovered, except on a failure, where they stay still instead of cheering.
 */
export function AuthMascotFan({ isCalm = false }: { isCalm?: boolean }): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="auth-fan flex items-end justify-center -space-x-1.5"
      data-calm={isCalm || undefined}
    >
      {FANNED_MASCOTS.map((mascot, index) => (
        <span
          key={mascot.mascotId}
          className="auth-mascot block"
          style={{
            rotate: `${mascot.rotate}deg`,
            marginBottom: scaled(mascot.lift),
            animationDelay: `${index * 70}ms`,
          }}
        >
          <ProjectAvatar
            projectId=""
            mascotId={mascot.mascotId}
            className="project-avatar-sharp drop-shadow-lg"
            style={{ width: scaled(mascot.size), height: scaled(mascot.size) }}
          />
        </span>
      ))}
    </div>
  )
}

/** A length that follows the fan's scale, set smaller on phones in the stylesheet. */
function scaled(pixels: number): string {
  return `calc(${pixels}px * var(--mascot-scale))`
}
