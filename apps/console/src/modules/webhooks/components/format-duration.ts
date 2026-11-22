import { formatCount } from '@/shared/lib/format-number'

const MS_PER_SECOND = 1000
const DECIMAL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** How long a receiver took: "120 ms" under a second, "1,4 s" above. */
export function formatDuration(ms: number): string {
  if (ms < MS_PER_SECOND) {
    return `${formatCount(ms)} ms`
  }

  return `${DECIMAL.format(ms / MS_PER_SECOND)} s`
}
