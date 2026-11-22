import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'

type TeamView = components['schemas']['TeamView']

/**
 * The one rule that shapes this list for the viewer, said once below it: members learn why
 * they cannot change the team, and a lone owner learns the next step to share the project.
 */
export function TeamNotes({ team }: { team: TeamView }): JSX.Element | null {
  if (team.can_manage === false) {
    return <Note>Você é membro: só donos convidam, removem pessoas e mudam papéis.</Note>
  }

  if (team.members.length === 1 && team.invitations.length === 0) {
    return (
      <Note>
        Só você tem acesso a este projeto. Convide alguém para não depender de uma conta só.
      </Note>
    )
  }

  return null
}

function Note({ children }: { children: string }): JSX.Element {
  return (
    <p className="border-t bg-surface px-4 py-2.5 text-xs text-pretty text-muted-foreground">
      {children}
    </p>
  )
}
