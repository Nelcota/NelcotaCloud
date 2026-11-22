import { formatCount } from '@/shared/lib/format-number'

/** "1 usuário", "1.234 usuários". */
export function countLabel(total: number): string {
  if (total === 1) {
    return '1 usuário'
  }

  return `${formatCount(total)} usuários`
}
