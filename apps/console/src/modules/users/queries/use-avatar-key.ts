import { useApiKeysQuery } from '@/modules/api-keys/queries/use-api-keys'

/** An active publishable key of the project, needed to load user photos; `null` until known. */
export function useAvatarKey(projectId: string): string | null {
  const keys = useApiKeysQuery(projectId)
  const publishable = keys.data?.find(
    (key) => key.kind === 'publishable' && isActive(key.revoked_at) && hasValue(key.key),
  )

  return publishable?.key ?? null
}

function isActive(revokedAt: string | null | undefined): boolean {
  return revokedAt === null || revokedAt === undefined
}

function hasValue(key: string | null | undefined): boolean {
  return key !== null && key !== undefined && key !== ''
}
