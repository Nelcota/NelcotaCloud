import { useSyncExternalStore } from 'react'

const NAVIGATION_EVENT = 'example:navigate'

export function navigate(path: string): void {
  window.history.pushState(null, '', path)
  window.dispatchEvent(new Event(NAVIGATION_EVENT))
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange)
  window.addEventListener(NAVIGATION_EVENT, onChange)

  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(NAVIGATION_EVENT, onChange)
  }
}

function readPathname(): string {
  return window.location.pathname
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, readPathname)
}
