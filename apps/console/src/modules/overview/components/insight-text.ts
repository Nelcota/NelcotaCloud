import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

const LISTED_NAMES = 3

export function namesOf(tables: Schemas['TableOverview'][]): string {
  const names = tables.slice(0, LISTED_NAMES).map((table) => table.name)
  const rest = tables.length - names.length

  if (rest > 0) {
    return `${names.join(', ')} e mais ${rest}`
  }

  return names.join(', ')
}

export function countText(count: number, one: string, many: string): string {
  if (count === 1) {
    return `1 ${one}`
  }

  return `${count.toLocaleString('pt-BR')} ${many}`
}
