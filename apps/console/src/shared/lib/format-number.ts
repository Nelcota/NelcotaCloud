const COMPACT = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const WHOLE = new Intl.NumberFormat('pt-BR')
const PERCENT = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })
const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const
const BYTE_STEP = 1024
const DECIMAL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const UNKNOWN = '—'

/** Counts the way the panel reads them: "980", "15,2 mil", "1,3 mi". */
export function formatCount(value: number): string {
  if (Number.isFinite(value) === false) {
    return UNKNOWN
  }

  if (Math.abs(value) < 10_000) {
    return WHOLE.format(value)
  }

  return COMPACT.format(value)
}

/** A ratio between 0 and 1 as "86,6%"; tiny non-zero shares read "<0,1%". */
export function formatShare(ratio: number): string {
  if (Number.isFinite(ratio) === false) {
    return UNKNOWN
  }

  if (ratio > 0 && ratio < 0.001) {
    return `<${PERCENT.format(0.001)}`
  }

  return PERCENT.format(ratio)
}

/** Sizes in binary units: "412 B", "114 MB", "33,1 GB". */
export function formatBytes(bytes: number): string {
  if (Number.isFinite(bytes) === false || bytes < 0) {
    return UNKNOWN
  }

  let value = bytes
  let unitIndex = 0

  while (value >= BYTE_STEP && unitIndex < BYTE_UNITS.length - 1) {
    value /= BYTE_STEP
    unitIndex += 1
  }

  const unit = BYTE_UNITS[unitIndex] ?? 'B'

  return `${DECIMAL.format(value)} ${unit}`
}
