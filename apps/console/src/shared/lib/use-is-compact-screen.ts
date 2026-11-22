import { useMediaQuery } from '@/shared/lib/use-media-query'

/** Phone-wide screens, where tables keep only their main column and their actions. */
const COMPACT_QUERY = '(max-width: 639px)'

export function useIsCompactScreen(): boolean {
  return useMediaQuery(COMPACT_QUERY)
}
