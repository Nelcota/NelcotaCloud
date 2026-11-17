import type { components } from '../generated/api-schema'
import type { HttpClient } from '../http/http-client'
import type {
  AuthStateListener,
  Session,
  SignInResult,
  SignUpResult,
  User,
  UserMetadata,
} from '../types'
import { type AuthorizedContext, authorizedRequest } from './authorized-request'
import { AvatarApi } from './avatar-api'
import { toSession, toSignInResult, toSignUpResult } from './login-results'
import { MfaApi } from './mfa-api'
import { OAuthApi } from './oauth-api'
import type { SessionManager } from './session-manager'
import type { SessionStore } from './session-store'
import { SessionsApi } from './sessions-api'

type Schemas = components['schemas']
type Credentials = { email: string; password: string }

export type AuthContext = {
  http: HttpClient
  manager: SessionManager
  store: SessionStore
  now: () => number
}

/** Signup, login (password, magic link, OAuth, MFA) and the session of the tenant's users. */
export class AuthClient {
  readonly avatar: AvatarApi
  readonly mfa: MfaApi
  readonly oauth: OAuthApi
  readonly sessions: SessionsApi
  private readonly context: AuthorizedContext
  private readonly http: HttpClient
  private readonly manager: SessionManager
  private readonly now: () => number

  constructor(context: AuthContext) {
    this.context = context
    this.http = context.http
    this.manager = context.manager
    this.now = context.now
    this.avatar = new AvatarApi(context)
    this.mfa = new MfaApi(context)
    this.oauth = new OAuthApi(context)
    this.sessions = new SessionsApi(context)
  }

  async signUp(credentials: Credentials): Promise<SignUpResult> {
    const response = await this.post<Schemas['SignUpResponse']>('/auth/v1/signup', credentials)
    const result = toSignUpResult(response, this.now)

    if (result.kind === 'session') {
      this.manager.start(result.session, 'SIGNED_IN')
    }

    return result
  }

  async signInWithPassword(credentials: Credentials): Promise<SignInResult> {
    const response = await this.post<Schemas['LoginResponse']>('/auth/v1/login', credentials)

    return this.startIfSession(toSignInResult(response, this.now))
  }

  /** Second step of a login with MFA on: the `mfaToken` of the login and a TOTP code. */
  async verifyMfa(challenge: { mfaToken: string; code: string }): Promise<Session> {
    const body = { mfa_token: challenge.mfaToken, code: challenge.code }
    const tokens = await this.post<Schemas['SessionTokens']>('/auth/v1/mfa/challenge', body)
    const session = toSession(tokens, this.now)
    this.manager.start(session, 'SIGNED_IN')

    return session
  }

  /** Emails a one-time login link (signing the email up when it has no account). */
  async sendMagicLink(target: { email: string }): Promise<void> {
    await this.post<void>('/auth/v1/magic-link', target)
  }

  /** Trades the `token` from the magic link's URL for a session (or an MFA step). */
  async verifyMagicLink(link: { token: string }): Promise<SignInResult> {
    const response = await this.post<Schemas['LoginResponse']>('/auth/v1/magic-link/verify', link)

    return this.startIfSession(toSignInResult(response, this.now))
  }

  async verifyEmail(link: { token: string }): Promise<User> {
    return this.post<User>('/auth/v1/verify-email', link)
  }

  async resendVerification(target: { email: string }): Promise<void> {
    await this.post<void>('/auth/v1/verify-email/resend', target)
  }

  async recoverPassword(target: { email: string }): Promise<void> {
    await this.post<void>('/auth/v1/recover', target)
  }

  /** Sets a new password from the reset link; every session of the user ends. */
  async resetPassword(reset: { token: string; password: string }): Promise<void> {
    await this.post<void>('/auth/v1/reset-password', reset)
  }

  getSession(): Session | null {
    return this.manager.current()
  }

  /** A valid access token for your own API calls, renewed when needed. */
  getAccessToken(): Promise<string> {
    return this.manager.accessToken()
  }

  refreshSession(): Promise<Session | null> {
    return this.manager.refresh()
  }

  async getUser(): Promise<User> {
    return authorizedRequest<User>(this.context, { method: 'GET', path: '/auth/v1/user' })
  }

  /**
   * Replaces the user's own `user_metadata` (up to 16 KiB as JSON). `app_metadata` is written
   * only by the project's admins and reaches the access token on the next refresh.
   */
  async updateUser(userMetadata: UserMetadata): Promise<User> {
    const user = await authorizedRequest<User>(this.context, {
      method: 'PATCH',
      path: '/auth/v1/user',
      body: { user_metadata: userMetadata },
    })
    this.manager.updateUser(user)

    return user
  }

  /** Ends the session on the server and forgets it here, even when the server cannot be reached. */
  async signOut(): Promise<void> {
    const session = this.manager.current()
    const generation = this.manager.generation()

    try {
      if (session !== null) {
        await this.post<void>('/auth/v1/logout', { refresh_token: session.refreshToken })
      }
    } finally {
      this.manager.endIfGenerationMatches(generation)
    }
  }

  /** Deletes the user's account and all its data, then signs out. */
  async deleteAccount(): Promise<void> {
    const generation = this.manager.generation()
    await authorizedRequest<void>(this.context, { method: 'DELETE', path: '/auth/v1/user' })
    this.manager.endIfGenerationMatches(generation)
  }

  onAuthStateChange(listener: AuthStateListener): () => void {
    return this.manager.subscribe(listener)
  }

  private startIfSession(result: SignInResult): SignInResult {
    if (result.kind === 'session') {
      this.manager.start(result.session, 'SIGNED_IN')
    }

    return result
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return this.http.request<T>({ method: 'POST', path, body })
  }
}
