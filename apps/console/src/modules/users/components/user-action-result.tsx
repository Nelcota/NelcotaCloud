import CircleCheck from '~icons/solar/check-circle-linear'
import type { JSX } from 'react'

import type { UserAction } from '@/modules/users/queries/use-users'

const DONE_MESSAGES: Record<UserAction, string> = {
  ban: 'Usuário bloqueado e sessões encerradas',
  unban: 'Usuário desbloqueado',
  'end-sessions': 'Sessões encerradas',
  'reset-mfa': 'Autenticador removido',
  delete: 'Usuário excluído',
}

type UserActionResultProps = {
  /** The last action that succeeded, with the user's email; `null` when there is none. */
  done: { action: UserAction; email: string } | null
}

/** Says that an admin action worked, since most of them leave no visible trace in the list. */
export function UserActionResult({ done }: UserActionResultProps): JSX.Element {
  return (
    <p role="status" className="text-sm text-emerald-700 empty:hidden dark:text-emerald-400">
      <DoneMessage done={done} />
    </p>
  )
}

function DoneMessage({ done }: UserActionResultProps): JSX.Element | null {
  if (done === null) {
    return null
  }

  return (
    <span className="flex items-center gap-1.5">
      <CircleCheck className="size-5 shrink-0" />
      {DONE_MESSAGES[done.action]}: {done.email}
    </span>
  )
}
