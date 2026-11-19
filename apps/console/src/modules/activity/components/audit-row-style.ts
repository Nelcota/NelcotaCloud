import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/class-names'

export { CELL_UNDER_ICON, CELL_X, CELL_Y } from '@/shared/ui/table-styles'

type AuditAction = components['schemas']['AuditAction']

/**
 * Which columns show from which width of the table itself (a container query), since the
 * sidebar takes a variable share of the window. Below each width, the column's content moves
 * into the event cell, so nothing is ever hidden.
 */
export const COLUMN_CLASSES = {
  user: 'hidden @2xl:table-cell',
  origin: 'hidden @5xl:table-cell',
  time: 'hidden @xl:table-cell',
} as const

/** The same widths, for what stands in for a hidden column inside the event cell. */
export const STAND_IN_CLASSES = {
  user: '@2xl:hidden',
  origin: '@5xl:hidden',
  time: '@xl:hidden',
} as const

/** Amber marks a threat (refused logins, guessing IPs), apart from red, which means loss. */
export const THREAT_TONE = 'text-amber-700 dark:text-amber-400'

/** Red means loss (DESIGN.md): an account removed or locked out, nothing else. */
const LOSS_ACTIONS: ReadonlySet<AuditAction> = new Set(['user_banned', 'user_deleted'])
const THREAT_ACTIONS: ReadonlySet<AuditAction> = new Set(['login_failed'])

export function actionClass(action: AuditAction): string {
  return cn(
    'font-semibold',
    LOSS_ACTIONS.has(action) && 'text-destructive',
    THREAT_ACTIONS.has(action) && THREAT_TONE,
  )
}
