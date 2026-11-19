import { useEffect, useSyncExternalStore } from 'react'

/**
 * A page that is about one thing (a user) names the browser tab after it, so several open tabs
 * tell apart. The shell reads it in place of the section's name.
 */
let current: string | null = null
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

/** Names the tab while the calling page is shown; the section name returns when it leaves. */
export function usePageTitleOverride(title: string | null): void {
  useEffect(() => {
    current = title
    notify()

    return () => {
      current = null
      notify()
    }
  }, [title])
}

/** For the shell: the name a page asked for, or `null` to use the section's own. */
export function usePageTitleOverrideValue(): string | null {
  return useSyncExternalStore(subscribe, () => current)
}
