import type { Range } from '@/modules/overview/components/growth-geometry'

/** Counts read from zero, so a quiet day sits on the floor instead of mid-chart. */
export function countRange(values: readonly number[]): Range {
  return { min: 0, max: Math.max(...values, 1) }
}
