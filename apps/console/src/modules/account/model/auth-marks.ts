import CheckCircle from '~icons/solar/check-circle-linear'
import CloseCircle from '~icons/solar/close-circle-linear'
import DangerCircle from '~icons/solar/danger-circle-linear'
import LetterUnread from '~icons/solar/letter-unread-linear'
import LinkRound from '~icons/solar/link-round-linear'
import LockPassword from '~icons/solar/lock-password-linear'
import LockUnlocked from '~icons/solar/lock-keyhole-minimalistic-unlocked-linear'
import Refresh from '~icons/solar/refresh-linear'
import ShieldKeyhole from '~icons/solar/shield-keyhole-linear'

import type { StatusMark } from '@/shared/ui/status-icon'

/**
 * One icon per kind of auth step, so the same situation looks the same on every page: a link
 * that failed, a link that was sent, a check that passed. Sign-in and sign-up have none; the
 * mascots already open those.
 */
export const AUTH_MARKS = {
  loading: { icon: Refresh, tone: 'neutral', isSpinning: true },
  done: { icon: CheckCircle, tone: 'success' },
  failed: { icon: CloseCircle, tone: 'danger' },
  brokenLink: { icon: DangerCircle, tone: 'danger' },
  emailSent: { icon: LetterUnread, tone: 'neutral' },
  recover: { icon: LockUnlocked, tone: 'neutral' },
  newPassword: { icon: LockPassword, tone: 'neutral' },
  mfa: { icon: ShieldKeyhole, tone: 'neutral' },
  magicLink: { icon: LinkRound, tone: 'neutral' },
} satisfies Record<string, StatusMark>
