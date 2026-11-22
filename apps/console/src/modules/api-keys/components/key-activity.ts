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

/** The keys of one kind, active ones first, each part in the API's order. */
export function keysOfKind(keys: ApiKeySummary[], kind: string): ApiKeySummary[] {
  const ofKind = keys.filter((key) => key.kind === kind)
  const active = ofKind.filter((key) => isRevokedKey(key) === false)
  const revoked = ofKind.filter((key) => isRevokedKey(key))

  return [...active, ...revoked]
}

/** The API refuses to revoke the only active secret key, so the console never offers it. */
export function isLastSecret(kind: string, activeOfKind: number): boolean {
  return kind === 'secret' && activeOfKind <= 1
}

/** The whole key when the list may show it; `null` when only its last characters are known. */
export function visibleKey(apiKey: ApiKeySummary, isRevoked: boolean): string | null {
  const value = apiKey.key

  if (apiKey.kind !== 'publishable' || value === null || value === undefined || isRevoked) {
    return null
  }

  return value
}

/** The first active publishable key the API returns in full, for the connect panel. */
export function firstVisiblePublishable(keys: ApiKeySummary[] | undefined): string | null {
  if (keys === undefined) {
    return null
  }

  const visible = activeKeys(keys)
    .map((key) => visibleKey(key, false))
    .find((value) => value !== null)

  return visible ?? null
}
