import type { components } from '../generated/api-schema'

type Schemas = components['schemas']

export type User = Schemas['User']
export type MfaStatus = Schemas['MfaStatus']
export type TotpEnrollment = Schemas['TotpEnrollmentResponse']
export type SessionSummary = Schemas['SessionSummary']

/** A JSON object; `updateUser` replaces the user's whole `user_metadata` with it. */
export type UserMetadata = User['user_metadata']

/** What the SDK keeps for a logged-in user. */
export type Session = {
  accessToken: string
  refreshToken: string
  /** Milliseconds since the epoch at which the access token expires. */
  expiresAt: number
  user: User
}

/** A login either opens a session or asks for the user's TOTP code first. */
export type SignInResult =
  | { kind: 'session'; session: Session }
  | { kind: 'mfa_required'; mfaToken: string }

/** Tenants that require email verification answer signups with a note to check the inbox. */
export type SignUpResult = { kind: 'session'; session: Session } | { kind: 'verification_required' }

export type OAuthProvider = 'google' | 'github'

export type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED'

export type AuthStateListener = (event: AuthEvent, session: Session | null) => void
