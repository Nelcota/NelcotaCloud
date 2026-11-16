import type { HttpClient, HttpMethod } from '../http/http-client'
import type { MfaStatus, TotpEnrollment } from '../types'
import type { SessionManager } from './session-manager'

type MfaContext = { http: HttpClient; manager: SessionManager }

/** The logged-in user's TOTP second factor. */
export class MfaApi {
  private readonly http: HttpClient
  private readonly manager: SessionManager

  constructor(context: MfaContext) {
    this.http = context.http
    this.manager = context.manager
  }

  getStatus(): Promise<MfaStatus> {
    return this.call<MfaStatus>('GET', '/auth/v1/mfa')
  }

  /** Starts adding an authenticator; show `otpauth_uri` as a QR code, then call `verifyTotp`. */
  enrollTotp(): Promise<TotpEnrollment> {
    return this.call<TotpEnrollment>('POST', '/auth/v1/mfa/totp')
  }

  /** The first code from the app turns TOTP on. */
  async verifyTotp(input: { code: string }): Promise<void> {
    await this.call<void>('POST', '/auth/v1/mfa/totp/verify', input)
  }

  /** Turns TOTP off; requires a current code. */
  async disableTotp(input: { code: string }): Promise<void> {
    await this.call<void>('DELETE', '/auth/v1/mfa/totp', input)
  }

  private async call<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    const accessToken = await this.manager.accessToken()

    return this.http.request<T>({ method, path, body, accessToken })
  }
}
