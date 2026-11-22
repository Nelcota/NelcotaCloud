import { useEffect } from 'react'

/** Calls `onOpen` on Ctrl+K (⌘K on macOS), the usual shortcut for a console's search. */
export function useCommandShortcut(onOpen: () => void, enabled: boolean): void {
  useEffect(() => {
    if (enabled === false) {
      return
    }

    function handleKey(event: KeyboardEvent): void {
      if (event.key.toLowerCase() !== 'k') {
        return
      }

      if (event.metaKey === false && event.ctrlKey === false) {
        return
      }

      event.preventDefault()
      onOpen()
    }

    window.addEventListener('keydown', handleKey)

    return () => window.removeEventListener('keydown', handleKey)
  }, [enabled, onOpen])
}
