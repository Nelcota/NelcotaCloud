import type { components } from '@/shared/api/api-schema'

type ApiKeySummary = components['schemas']['ApiKeySummary']

export function isRevokedKey(key: ApiKeySummary): boolean {
  return key.revoked_at !== null && key.revoked_at !== undefined
}

export function activeKeys(keys: ApiKeySummary[]): ApiKeySummary[] {
  return keys.filter((key) => isRevokedKey(key) === false)
}

export function countActive(keys: ApiKeySummary[], kind: string): number {
  return activeKeys(keys).filter((key) => key.kind === kind).length
}
