import { type RefObject, useEffect, useRef, useState } from 'react'

/** The rendered width of an element, kept current as it resizes (0 before the first layout). */
export function useElementWidth<Element extends HTMLElement>(): {
  ref: RefObject<Element | null>
  width: number
} {
  const ref = useRef<Element | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current

    if (element === null) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]

      if (entry === undefined) {
        return
      }

      setWidth(entry.contentRect.width)
    })
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return { ref, width }
}
