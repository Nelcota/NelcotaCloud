export type CountMode = 'exact' | 'planned'

/** Above this size a full count(*) costs too much. */
const EXACT_COUNT_LIMIT = 100_000

export function tableCountMode(estimatedRows: number | null): CountMode {
  if (estimatedRows !== null && estimatedRows > EXACT_COUNT_LIMIT) {
    return 'planned'
  }

  return 'exact'
}
