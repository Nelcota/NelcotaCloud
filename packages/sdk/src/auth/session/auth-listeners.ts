import type { AuthEvent, AuthStateListener, Session } from '../auth-types'

/** The app's `onAuthStateChange` listeners. */
export class AuthListeners {
  private readonly listeners = new Set<AuthStateListener>()

  add(listener: AuthStateListener): () => void {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  notify(event: AuthEvent, session: Session | null): void {
    for (const listener of this.listeners) {
      callIsolated(listener, event, session)
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}

function callIsolated(
  listener: AuthStateListener,
  event: AuthEvent,
  session: Session | null,
): void {
  try {
    listener(event, session)
  } catch (error) {
    // A broken listener must neither undo the login that triggered it nor silence the other
    // listeners, so its error is rethrown on its own where the app's error reporting sees it.
    queueMicrotask(() => {
      throw error
    })
  }
}
