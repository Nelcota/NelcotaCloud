import { type JSX, useEffect, useRef, useState } from 'react'

import { useMediaQuery } from '@/shared/lib/use-media-query'

const DURATION_MS = 400
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

type AnimatedNumberProps = {
  value: number
  format: (value: number) => string
}

/** A figure that counts from its previous value to the new one when the data refreshes. */
export function AnimatedNumber({ value, format }: AnimatedNumberProps): JSX.Element {
  const isReduced = useMediaQuery(REDUCED_MOTION)
  const shown = useCountUp(value, isReduced)

  return <span className="tabular-nums">{format(shown)}</span>
}

function useCountUp(target: number, isReduced: boolean): number {
  const [shown, setShown] = useState(target)
  const from = useRef(target)

  useEffect(() => {
    const start = from.current
    from.current = target

    if (isReduced || start === target || Number.isFinite(target) === false) {
      setShown(target)
      return undefined
    }

    const began = performance.now()
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min((now - began) / DURATION_MS, 1)
      const eased = 1 - (1 - progress) ** 3
      setShown(Math.round(start + (target - start) * eased))

      if (progress < 1) {
        frame = requestAnimationFrame(step)
      }
    })

    return () => cancelAnimationFrame(frame)
  }, [target, isReduced])

  return shown
}
