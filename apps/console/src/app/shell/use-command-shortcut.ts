import { useEffect } from 'react'

/**
 * Calls `onPress` on Ctrl+K (⌘K on macOS), the usual shortcut for a console's search. Always
 * listening, so the keys never fall through to the browser's own Ctrl+K while the search is open.
 */
export function useCommandShortcut(onPress: () => void): void {
  useEffect(() => {
    function handleKey(event: KeyboardEvent): void {
      if (event.key.toLowerCase() !== 'k') {
        return
      }

      if (event.metaKey === false && event.ctrlKey === false) {
        return
      }

      event.preventDefault()
      onPress()
    }

    window.addEventListener('keydown', handleKey)

    return () => window.removeEventListener('keydown', handleKey)
  }, [onPress])
}
