export const LOADING_DETAIL = 'Carregando…'

/** `null` until the figure arrives, so the card shows a placeholder rather than a false zero. */
export function countOrNull(count: number | undefined): string | null {
  if (count === undefined) {
    return null
  }

  return count.toLocaleString('pt-BR')
}
