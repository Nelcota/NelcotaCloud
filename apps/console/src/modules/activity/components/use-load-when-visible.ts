import { type RefObject, useEffect } from 'react'

/** Starts loading a little before the end of the list shows, so scrolling rarely waits. */
const LOOKAHEAD = '0px 0px 400px 0px'

/**
 * Calls `onLoad` when the element scrolls into view, so older events load as the reader gets
 * to them. The element stays a button, for keyboards and for browsers without the observer.
 */
export function useLoadWhenVisible(
  target: RefObject<HTMLElement | null>,
  onLoad: () => void,
): void {
  useEffect(() => {
    const element = target.current

    if (element === null || typeof IntersectionObserver === 'undefined') {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoad()
        }
      },
      { rootMargin: LOOKAHEAD },
    )
    observer.observe(element)

    return () => observer.disconnect()
  }, [target, onLoad])
}
