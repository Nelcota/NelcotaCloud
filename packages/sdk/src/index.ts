export { AuthClient } from './auth/auth-client'
export { AvatarApi } from './auth/avatar-api'
export { MfaApi } from './auth/mfa-api'
export { OAuthApi } from './auth/oauth-api'
export { SessionsApi } from './auth/sessions-api'
export { defaultStorage, memoryStorage } from './auth/session-storage'
export type { SessionStorageAdapter } from './auth/session-storage'
export { createClient } from './client/create-client'
export type { ClientOptions, NelcotaClient } from './client/create-client'
export { NelcotaError } from './http/nelcota-error'
export type {
  AuthEvent,
  AuthStateListener,
  MfaStatus,
  OAuthProvider,
  Session,
  SessionSummary,
  SignInResult,
  SignUpResult,
  TotpEnrollment,
  User,
} from './types'
export { verifyWebhook } from './webhooks/verify-webhook'
export type { VerifyWebhookOptions, WebhookEvent, WebhookHeaders } from './webhooks/verify-webhook'
export { WebhookVerificationError } from './webhooks/webhook-verification-error'
export type { WebhookVerificationCode } from './webhooks/webhook-verification-error'
