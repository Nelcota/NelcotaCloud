import { type RefObject, useEffect } from 'react'

/** Typing in these keeps the slash as a character instead of jumping to the search. */
const TYPING_TAGS: ReadonlySet<string> = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** `/` focuses the search field, as in most consoles and code hosts. */
export function useSlashShortcut(target: RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    function focusSearch(event: KeyboardEvent): void {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      if (isTyping(event.target)) {
        return
      }

      event.preventDefault()
      target.current?.focus()
    }

    window.addEventListener('keydown', focusSearch)

    return () => window.removeEventListener('keydown', focusSearch)
  }, [target])
}

function isTyping(element: EventTarget | null): boolean {
  if (element instanceof HTMLElement === false) {
    return false
  }

  return TYPING_TAGS.has(element.tagName) || element.isContentEditable
}
