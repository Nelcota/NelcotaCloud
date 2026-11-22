import type { StatusTotals } from '@/modules/users/queries/use-status-totals'
import { formatCount } from '@/shared/lib/format-number'
import type { NoticeTone } from '@/shared/ui/notice'

export type UsersHealth = { tone: NoticeTone; verdict: string; sentence: string }

type KnownTotals = { all: number; unverified: number; banned: number }

/** The users page's verdict from its own counts; `null` while they load or with no accounts yet. */
export function usersHealth(totals: StatusTotals): UsersHealth | null {
  const { all, unverified, banned } = totals

  if (all === undefined || unverified === undefined || banned === undefined || all === 0) {
    return null
  }

  return healthOf({ all, unverified, banned })
}

function healthOf(totals: KnownTotals): UsersHealth {
  if (totals.unverified > 0) {
    return {
      tone: 'warning',
      verdict: `${accounts(totals.unverified)} sem email confirmado.`,
      sentence: bannedSentence(totals.banned),
    }
  }

  if (totals.banned > 0) {
    return {
      tone: 'warning',
      verdict: `${accounts(totals.banned)} ${blocked(totals.banned)}.`,
      sentence: 'Todas as contas confirmaram o email.',
    }
  }

  return {
    tone: 'success',
    verdict: 'Tudo certo.',
    sentence: `${capitalized(accounts(totals.all))}, todas com email confirmado e nenhuma bloqueada.`,
  }
}

/** "1 conta", "1.234 contas". */
function accounts(count: number): string {
  if (count === 1) {
    return '1 conta'
  }

  return `${formatCount(count)} contas`
}

function blocked(count: number): string {
  if (count === 1) {
    return 'bloqueada'
  }

  return 'bloqueadas'
}

function bannedSentence(banned: number): string {
  if (banned === 0) {
    return 'Nenhuma conta bloqueada.'
  }

  return `${accounts(banned)} ${blocked(banned)}.`
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
