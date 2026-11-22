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
      sentence: 'Todos os usuários confirmaram o email.',
    }
  }

  return {
    tone: 'success',
    verdict: 'Tudo certo.',
    sentence: `${capitalized(accounts(totals.all))}, todos com email confirmado e nenhum bloqueado.`,
  }
}

/** "1 usuário", "1.234 usuários". */
function accounts(count: number): string {
  if (count === 1) {
    return '1 usuário'
  }

  return `${formatCount(count)} usuários`
}

function blocked(count: number): string {
  if (count === 1) {
    return 'bloqueado'
  }

  return 'bloqueados'
}

function bannedSentence(banned: number): string {
  if (banned === 0) {
    return 'Nenhum usuário bloqueado.'
  }

  return `${accounts(banned)} ${blocked(banned)}.`
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
