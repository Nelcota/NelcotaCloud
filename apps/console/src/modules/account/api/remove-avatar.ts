import { nelcota } from '@/shared/auth/nelcota'

export function removeAvatar(): Promise<void> {
  return nelcota.auth.avatar.remove()
}
