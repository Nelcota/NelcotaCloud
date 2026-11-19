import type { HttpClient } from '../http/http-client'
import type { User } from './auth-types'
import { type AuthorizedContext, authorizedRequest } from './authorized-request'
import type { SessionManager } from './session/session-manager'
type AvatarOwner = Pick<User, 'id' | 'avatar_updated_at'>

const AVATAR_PATH = '/auth/v1/user/avatar'

/** The logged-in user's profile photo, and the public URL of anyone's. */
export class AvatarApi {
  private readonly context: AuthorizedContext
  private readonly http: HttpClient
  private readonly manager: SessionManager

  constructor(context: AuthorizedContext) {
    this.context = context
    this.http = context.http
    this.manager = context.manager
  }

  /**
   * Uploads a PNG, JPEG or WebP image (up to 1 MiB). The server crops it to a centered square,
   * so crop it first to choose the part that shows.
   */
  async upload(image: Blob): Promise<User> {
    const user = await authorizedRequest<User>(this.context, {
      method: 'PUT',
      path: AVATAR_PATH,
      file: image,
    })
    this.manager.updateUser(user)

    return user
  }

  async remove(): Promise<void> {
    await authorizedRequest<void>(this.context, { method: 'DELETE', path: AVATAR_PATH })
    const session = this.manager.current()

    if (session === null) {
      return
    }

    this.manager.updateUser({ ...session.user, avatar_updated_at: null })
  }

  /** For an `<img src>`; `null` when the user has no photo. A new photo gets a new URL. */
  url(user: AvatarOwner): string | null {
    const version = user.avatar_updated_at

    if (version === null || version === undefined) {
      return null
    }

    const query = new URLSearchParams({ apikey: this.http.publishableKey, version })

    return `${this.http.baseUrl}/auth/v1/users/${encodeURIComponent(user.id)}/avatar?${query}`
  }
}
