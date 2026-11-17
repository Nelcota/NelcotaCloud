import { nelcota } from '@/shared/auth/nelcota'
import { useSession } from '@/shared/auth/use-session'

/** The signed-in console account, to mark its own rows and show its own photo. */
export type CurrentAccount = { id: string; photoUrl: string | null }

export function useCurrentAccount(): CurrentAccount {
  const session = useSession()

  if (session === null) {
    return { id: '', photoUrl: null }
  }

  return { id: session.user.id, photoUrl: nelcota.auth.avatar.url(session.user) }
}
