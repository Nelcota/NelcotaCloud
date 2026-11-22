import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { JSX } from 'react'

import { cn } from '@/shared/lib/utils'

const PERCENT_FORMAT = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
  signDisplay: 'exceptZero',
})

type Direction = 'up' | 'down' | 'flat'

const TONES: Record<Direction, string> = {
  up: 'bg-success/12 text-success',
  down: 'bg-warning/12 text-warning',
  flat: 'bg-surface text-muted-foreground',
}
const GLYPHS = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus }

type DeltaPillProps = {
  /** The change in percent; nothing is drawn without one. */
  change: number | null
  /** What the change covers, for screen readers ("em 30 dias"). */
  span: string
}

/** How the headline figure moved, as a signed percentage. */
export function DeltaPill({ change, span }: DeltaPillProps): JSX.Element | null {
  if (change === null) {
    return null
  }

  const rounded = Math.round(change)
  const direction = directionOf(rounded)
  const Glyph = GLYPHS[direction]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium tabular-nums',
        TONES[direction],
      )}
    >
      <Glyph aria-hidden className="size-4" />
      {PERCENT_FORMAT.format(rounded)}%<span className="sr-only">{span}</span>
    </span>
  )
}

function directionOf(rounded: number): Direction {
  if (rounded > 0) {
    return 'up'
  }

  if (rounded < 0) {
    return 'down'
  }

  return 'flat'
}
