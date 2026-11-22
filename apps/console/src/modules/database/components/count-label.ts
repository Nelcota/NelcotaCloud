/** "1 linha", "1.234 linhas": a count with the noun that agrees with it, in pt-BR digits. */
export function countLabel(count: number, singular: string, plural: string): string {
  if (count === 1) {
    return `1 ${singular}`
  }

  return `${count.toLocaleString('pt-BR')} ${plural}`
}
