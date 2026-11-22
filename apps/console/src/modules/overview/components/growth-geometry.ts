/** The chart draws in a 100 x 100 box stretched to its frame, so points are percentages. */
const BOX = 100
/** Keeps the line's peaks and floor off the frame's edges. */
const INSET = 8
/** A flat series sits low, where an unchanged base reads as calm rather than as a peak. */
const FLAT_Y = 70

export type Range = { min: number; max: number }

export function rangeOf(values: readonly number[]): Range {
  return { min: Math.min(...values), max: Math.max(...values) }
}

export function xAt(index: number, count: number): number {
  if (count <= 1) {
    return BOX / 2
  }

  return (BOX * index) / (count - 1)
}

export function yAt(value: number, range: Range): number {
  const spread = range.max - range.min

  if (spread <= 0 || Number.isFinite(spread) === false) {
    return FLAT_Y
  }

  return INSET + (BOX - INSET * 2) * (1 - (value - range.min) / spread)
}

/** An SVG path through every value, left to right, on its own range unless one is given. */
export function linePath(values: readonly number[], range: Range = rangeOf(values)): string {
  return values
    .map((value, index) => `${commandOf(index)}${xAt(index, values.length)},${yAt(value, range)}`)
    .join(' ')
}

/** The line closed down to the bottom, for the shaded area under it. */
export function areaPath(values: readonly number[], range: Range = rangeOf(values)): string {
  if (values.length === 0) {
    return ''
  }

  return `${linePath(values, range)} L${BOX},${BOX} L0,${BOX} Z`
}

/** The point closest to a horizontal position, given as a 0..1 ratio of the width. */
export function nearestIndex(ratio: number, count: number): number {
  if (count <= 1 || Number.isFinite(ratio) === false) {
    return 0
  }

  return Math.min(Math.max(Math.round(ratio * (count - 1)), 0), count - 1)
}

function commandOf(index: number): string {
  if (index === 0) {
    return 'M'
  }

  return 'L'
}
