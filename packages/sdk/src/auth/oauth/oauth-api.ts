import type { components } from '../../generated/api-schema'
import type { HttpClient } from '../../http/http-client'
import { NelcotaError } from '../../http/nelcota-error'
import type { OAuthProvider, SignInResult } from '../auth-types'
import { toSignInResult } from '../login-results'
import { oauthCallbackError } from './oauth-callback-error'
import { createOAuthState, createPkcePair } from './pkce'
import type { SessionManager } from '../session/session-manager'
import type { PkceVerifierStore } from './pkce-verifier-store'

type LoginResponse = components['schemas']['LoginResponse']
type OAuthVerifierStore = Pick<PkceVerifierStore, 'saveVerifier' | 'takeVerifier'> &
  Partial<Pick<PkceVerifierStore, 'peekVerifier'>>
type OAuthContext = {
  http: HttpClient
  manager: SessionManager
  store: OAuthVerifierStore
  now: () => number
}

/**
 * Login with Google or GitHub. The app keeps a PKCE verifier, so the one-time `code` the
 * browser comes back with is useless to anyone else.
 */
export class OAuthApi {
  private readonly http: HttpClient
  private readonly manager: SessionManager
  private readonly store: OAuthVerifierStore
  private readonly now: () => number
  private readonly exchanges = new Map<string, Promise<SignInResult>>()

  constructor(context: OAuthContext) {
    this.http = context.http
    this.manager = context.manager
    this.store = context.store
    this.now = context.now
  }

  /** The URL to open in the browser. `redirectTo` must match a registered app callback. */
  async getAuthorizeUrl(request: { provider: OAuthProvider; redirectTo: string }): Promise<string> {
    const redirectTo = new URL(request.redirectTo)
    const pkce = await createPkcePair()
    const state = createOAuthState()
    this.store.saveVerifier(state, pkce.verifier)
    redirectTo.searchParams.set('nelcota_state', state)
    const query = new URLSearchParams({
      apikey: this.http.publishableKey,
      redirect_to: redirectTo.toString(),
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256',
    })

    return `${this.http.baseUrl}/auth/v1/oauth/${request.provider}/authorize?${query.toString()}`
  }

  /**
   * Call on the redirect page with its full URL (`location.href`). The API comes back with a
   * one-time `code`, or an `error` (e.g. `access_denied`) that is thrown as a `NelcotaError`.
   */
  async exchangeCode(callbackUrl: string | URL): Promise<SignInResult> {
    const parameters = new URL(callbackUrl).searchParams
    const state = parameters.get('nelcota_state')

    const error = parameters.get('error')

    if (error !== null) {
      this.discardVerifier(state)
      throw oauthCallbackError(error)
    }

    const code = parameters.get('code')

    if (code === null) {
      this.discardVerifier(state)
      throw oauthCallbackError('missing_oauth_code')
    }

    if (state === null) {
      throw oauthCallbackError('missing_pkce_verifier')
    }

    const key = JSON.stringify([state, code])
    const running = this.exchanges.get(key)

    if (running !== undefined) {
      return running
    }

    const exchange = this.redeemCode(state, code)
    this.exchanges.set(key, exchange)

    try {
      return await exchange
    } finally {
      this.exchanges.delete(key)
    }
  }

  private async redeemCode(state: string, code: string): Promise<SignInResult> {
    const readsWithoutRemoval = this.store.peekVerifier !== undefined
    const verifier = this.store.peekVerifier
      ? this.store.peekVerifier(state)
      : this.store.takeVerifier(state)

    if (verifier === null) {
      throw oauthCallbackError('missing_pkce_verifier')
    }

    let response: LoginResponse

    try {
      response = await this.http.request<LoginResponse>({
        method: 'POST',
        path: '/auth/v1/oauth/token',
        body: { code, code_verifier: verifier },
      })
    } catch (error) {
      const definitive = isDefinitiveFailure(error)

      if (definitive && readsWithoutRemoval) {
        this.discardVerifier(state)
      } else if (definitive === false && readsWithoutRemoval === false) {
        this.store.saveVerifier(state, verifier)
      }

      throw error
    }

    if (readsWithoutRemoval) {
      this.discardVerifier(state)
    }

    const result = toSignInResult(response, this.now)

    if (result.kind === 'session') {
      this.manager.start(result.session, 'SIGNED_IN')
    }

    return result
  }

  private discardVerifier(state: string | null): void {
    if (state !== null) {
      this.store.takeVerifier(state)
    }
  }
}

function isDefinitiveFailure(error: unknown): boolean {
  return (
    error instanceof NelcotaError &&
    error.status >= 400 &&
    error.status < 500 &&
    [408, 425, 429].includes(error.status) === false
  )
}
