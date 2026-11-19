import type { Invitation } from '@/modules/account/model/login-search'

const STORAGE_KEY = 'nelcota-pending-invitation'
/** Matches how long an invitation reasonably waits; older notes are stale. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const MAX_PROJECT_NAME_LENGTH = 80

type StoredInvitation = { projectName: string; savedAt: number }

/**
 * Remembers an invitation across the email confirmation, which opens in another tab with no
 * invitation in its link. Storage can be blocked or cleared, so every access may quietly fail:
 * the note only restores wording, never access.
 */
export function rememberInvitation(invitation: Invitation): void {
  const stored: StoredInvitation = { projectName: invitation.projectName, savedAt: Date.now() }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Without storage the confirmation page simply opens the plain login.
  }
}

export function pendingInvitation(): Invitation | null {
  const stored = readStored()

  if (stored === null || Date.now() - stored.savedAt > MAX_AGE_MS) {
    return null
  }

  return { projectName: stored.projectName }
}

export function forgetInvitation(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}

/** Storage is outside the app: anything that is not the exact shape written above is ignored. */
function readStored(): StoredInvitation | null {
  const raw = readRaw()

  if (raw === null) {
    return null
  }

  try {
    const value: unknown = JSON.parse(raw)

    return storedInvitationFrom(value)
  } catch {
    return null
  }
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function storedInvitationFrom(value: unknown): StoredInvitation | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const projectName: unknown = Reflect.get(value, 'projectName')
  const savedAt: unknown = Reflect.get(value, 'savedAt')

  if (typeof projectName !== 'string' || typeof savedAt !== 'number') {
    return null
  }

  if (projectName.length > MAX_PROJECT_NAME_LENGTH || Number.isFinite(savedAt) === false) {
    return null
  }

  return { projectName, savedAt }
}
