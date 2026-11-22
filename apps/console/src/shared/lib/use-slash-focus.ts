import { type RefObject, useEffect } from 'react'

const TYPING_TARGETS = 'input, textarea, select, [contenteditable="true"]'

/** Focuses the given field when "/" is pressed anywhere outside another field, like the panel's search. */
export function useSlashFocus(
  target: RefObject<HTMLInputElement | null>,
  isEnabled: boolean,
): void {
  useEffect(() => {
    if (isEnabled === false) {
      return undefined
    }

    function focusOnSlash(event: KeyboardEvent): void {
      const origin = event.target

      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (origin instanceof Element && origin.closest(TYPING_TARGETS) !== null) {
        return
      }

      event.preventDefault()
      target.current?.focus()
    }

    document.addEventListener('keydown', focusOnSlash)

    return () => document.removeEventListener('keydown', focusOnSlash)
  }, [target, isEnabled])
}
