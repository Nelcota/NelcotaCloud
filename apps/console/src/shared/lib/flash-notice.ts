import { useSyncExternalStore } from 'react'

/** Long enough to read a sentence, short enough not to linger as stale news. */
const VISIBLE_MS = 6000

/** A sentence, and optionally a place to go next (e.g. revoking keys after removing someone). */
export type Flash = { message: string; link?: { label: string; href: string } }

let current: Flash | null = null
let clearTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

/**
 * Says an action worked. Kept outside React so it survives navigation: leaving a project
 * lands on the projects list, which then says so.
 */
export function showFlash(message: string, link?: Flash['link']): void {
  current = { message, link }
  restartTimer()
  notify()
}

export function useFlash(): Flash | null {
  return useSyncExternalStore(subscribe, () => current)
}

function restartTimer(): void {
  if (clearTimer !== null) {
    clearTimeout(clearTimer)
  }

  clearTimer = setTimeout(() => {
    current = null
    clearTimer = null
    notify()
  }, VISIBLE_MS)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}
