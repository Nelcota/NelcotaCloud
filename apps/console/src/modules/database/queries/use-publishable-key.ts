import { firstVisiblePublishable } from '@/modules/api-keys/components/key-activity'
import { useApiKeysQuery } from '@/modules/api-keys/queries/use-api-keys'

/** The project's first publishable key for code snippets; `null` while loading or when none shows. */
export function usePublishableKey(projectId: string): string | null {
  const keys = useApiKeysQuery(projectId)

  return firstVisiblePublishable(keys.data)
}
