import { firstVisiblePublishable } from '@/modules/api-keys/components/key-activity'
import { useApiKeysQuery } from '@/modules/api-keys/queries/use-api-keys'

/** The project's first active publishable key, for code snippets; null until one can be shown. */
export function usePublishableKey(projectId: string): string | null {
  const keys = useApiKeysQuery(projectId)

  return firstVisiblePublishable(keys.data)
}
