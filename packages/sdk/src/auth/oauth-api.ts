import type { components } from '../generated/api-schema'
import type { HttpClient } from '../http/http-client'
import { NelcotaError } from '../http/nelcota-error'
import type { OAuthProvider, SignInResult } from '../types'
import { toSignInResult } from './login-results'
import { createPkcePair } from './pkce'
import type { SessionManager } from './session-manager'
import type { SessionStore } from './session-store'

type LoginResponse = components['schemas']['LoginResponse']
type OAuthContext = { http: HttpClient; manager: SessionManager; store: SessionStore }

/**
 * Login with Google or GitHub. The app keeps a PKCE verifier, so the one-time `code` the
 * browser comes back with is useless to anyone else.
 */
export class OAuthApi {
  private readonly http: HttpClient
  private readonly manager: SessionManager
  private readonly store: SessionStore

  constructor(context: OAuthContext) {
    this.http = context.http
    this.manager = context.manager
    this.store = context.store
  }

  /** The URL to send the browser to. `redirectTo` must be under the tenant's site URL. */
  async getAuthorizeUrl(request: { provider: OAuthProvider; redirectTo: string }): Promise<string> {
    const pkce = await createPkcePair()
    this.store.saveVerifier(pkce.verifier)
    const query = new URLSearchParams({
      apikey: this.http.publishableKey,
      redirect_to: request.redirectTo,
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256',
    })

    return `${this.http.baseUrl}/auth/v1/oauth/${request.provider}/authorize?${query.toString()}`
  }

  /** Call on the redirect page with its `code` query parameter. */
  async exchangeCode(callback: { code: string }): Promise<SignInResult> {
    const verifier = this.store.takeVerifier()

    if (verifier === null) {
      throw new NelcotaError({
        status: 400,
        code: 'missing_pkce_verifier',
        message: 'No OAuth login was started in this browser',
        requestId: null,
      })
    }

    const response = await this.http.request<LoginResponse>({
      method: 'POST',
      path: '/auth/v1/oauth/token',
      body: { code: callback.code, code_verifier: verifier },
    })
    const result = toSignInResult(response)

    if (result.kind === 'session') {
      this.manager.start(result.session, 'SIGNED_IN')
    }

    return result
  }
}
