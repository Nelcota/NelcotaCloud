import type { Session } from '@nelcota/sdk'
import { useSyncExternalStore } from 'react'

import { nelcota } from './nelcota'

function subscribe(onChange: () => void): () => void {
  return nelcota.auth.onAuthStateChange(onChange)
}

function readSession(): Session | null {
  return nelcota.auth.getSession()
}

/** The current session; re-renders on sign in, sign out, refresh and changes in other tabs. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, readSession)
}
