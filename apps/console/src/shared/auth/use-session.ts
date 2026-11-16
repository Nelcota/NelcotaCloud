import type { Session } from '@nelcota/sdk'
import { useSyncExternalStore } from 'react'

import { nelcota } from '@/shared/auth/nelcota'

function subscribe(onChange: () => void): () => void {
  return nelcota.auth.onAuthStateChange(onChange)
}

function currentSession(): Session | null {
  return nelcota.auth.getSession()
}

/** The console account's session; re-renders on login, refresh and logout. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, currentSession)
}
