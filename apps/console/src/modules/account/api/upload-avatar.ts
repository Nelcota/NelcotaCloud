import type { User } from '@nelcota/sdk'

import { nelcota } from '@/shared/auth/nelcota'

/** The server crops to a centered square too, so send the part the user chose. */
export function uploadAvatar(image: Blob): Promise<User> {
  return nelcota.auth.avatar.upload(image)
}
