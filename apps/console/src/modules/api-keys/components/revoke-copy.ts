import Key from '~icons/solar/key-linear'

import { keyKindOf } from '@/modules/api-keys/components/key-kinds'
import type { components } from '@/shared/api/api-schema'
import { formatRelative } from '@/shared/lib/format-date'
import type { ConfirmChange } from '@/shared/ui/confirm-change'

const HOUR_IN_MILLISECONDS = 3_600_000

type ApiKeySummary = components['schemas']['ApiKeySummary']

export type RevokeCopy = {
  title: string
  description: string
  change: ConfirmChange
}

/**
 * What the revoke dialog says for one key: which key it is, the way the list names it, and what
 * stops working, including the app's login when it is the last publishable key.
 */
export function revokeCopy(apiKey: ApiKeySummary, activeOfKind: number): RevokeCopy {
  return {
    title: revokeTitle(apiKey),
    description: withRecentUse(revokeConsequence(apiKey.kind, activeOfKind), apiKey),
    change: { subject: keyLabel(apiKey), icon: Key, from: 'Ativa', to: 'Revogada' },
  }
}

/** "Chave do servidor …cc11": the kind in the page's words, then the end of the key. */
export function keyLabel(apiKey: ApiKeySummary): string {
  const kindName = keyKindOf(apiKey.kind)?.singular ?? apiKey.kind

  return `${kindName} …${apiKey.hint}`
}

/** The menu's one line under "Revogar": the reason it is off, or the worst it breaks. */
export function revokeMenuDetail(apiKey: ApiKeySummary, activeOfKind: number): string {
  if (canRevoke(apiKey, activeOfKind) === false) {
    return 'Única chave do servidor ativa: crie outra antes'
  }

  if (apiKey.kind === 'publishable' && activeOfKind <= 1) {
    return 'Única chave do app: o login do app para na hora'
  }

  return 'Para de funcionar na hora'
}

/** The last secret key cannot be revoked: the API refuses, so the console never offers it. */
export function canRevoke(apiKey: ApiKeySummary, activeOfKind: number): boolean {
  return apiKey.kind !== 'secret' || activeOfKind > 1
}

function revokeTitle(apiKey: ApiKeySummary): string {
  const label = keyLabel(apiKey)

  if (apiKey.name === '') {
    return `Revogar a ${label.charAt(0).toLowerCase()}${label.slice(1)}?`
  }

  return `Revogar “${apiKey.name}” (${label})?`
}

/**
 * A key used within the hour is most likely still in an app or server: say so first, since
 * revoking it then breaks something right away.
 */
function withRecentUse(consequence: string, apiKey: ApiKeySummary): string {
  const lastUsedAt = apiKey.last_used_at ?? null

  if (lastUsedAt === null || isWithinLastHour(lastUsedAt) === false) {
    return consequence
  }

  return `Ainda em uso: foi usada ${formatRelative(lastUsedAt)}. ${consequence}`
}

function isWithinLastHour(isoDate: string): boolean {
  const usedAt = new Date(isoDate).getTime()

  return Number.isNaN(usedAt) === false && Date.now() - usedAt < HOUR_IN_MILLISECONDS
}

function revokeConsequence(kind: string, activeOfKind: number): string {
  if (kind === 'publishable' && activeOfKind <= 1) {
    return 'É a única chave do app ativa: o app para de fazer login na hora, até você publicá-lo com uma chave nova.'
  }

  return 'Ela para de funcionar na hora. Apps e servidores que ainda a usam deixam de acessar a API.'
}
