import type { components } from '@/shared/api/api-schema'
import { API_BASE_URL } from '@/shared/api/api-base-url'

type User = components['schemas']['User']

/**
 * The public address of a project user's photo, or `null` without one. Photos are served with a
 * publishable key in the URL (secret keys are refused there), so a project without one shows
 * initials.
 */
export function userAvatarUrl(user: User, publishableKey: string | null): string | null {
  const version = user.avatar_updated_at

  if (version === null || version === undefined || publishableKey === null) {
    return null
  }

  const query = new URLSearchParams({ apikey: publishableKey, version })

  return `${API_BASE_URL}/auth/v1/users/${encodeURIComponent(user.id)}/avatar?${query.toString()}`
}
