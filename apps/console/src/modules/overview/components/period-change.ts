const PERCENT = 100

/**
 * How much a figure moved against an earlier one, in percent. `null` when there is no earlier
 * figure to compare with, rather than an infinite percentage.
 */
export function percentChange(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined || previous === 0) {
    return null
  }

  if (Number.isFinite(current) === false || Number.isFinite(previous) === false) {
    return null
  }

  return ((current - previous) / previous) * PERCENT
}
