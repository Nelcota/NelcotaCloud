import Letter from '~icons/solar/letter-linear'
import Trash from '~icons/solar/trash-bin-trash-linear'
import type { JSX } from 'react'

import { BreakableEmail } from '@/modules/team/components/breakable-email'
import type { InvitationRow } from '@/modules/team/components/team-rows'
import { formatDate } from '@/shared/lib/format-date'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const HEAD = 'h-11 px-4'
const CELL = 'px-4 py-4'

type InvitationsTableProps = {
  rows: InvitationRow[]
  canManage: boolean
  onCancel: (invitation: InvitationRow) => Promise<void>
}

/** Invitations nobody answered yet; owners cancel them right from the row. */
export function InvitationsTable({
  rows,
  canManage,
  onCancel,
}: InvitationsTableProps): JSX.Element {
  return (
    <div className="surface overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={`${HEAD} sm:px-5`}>Email</TableHead>
            <TableHead className={`${HEAD} hidden sm:table-cell`}>Enviado em</TableHead>
            <ActionsHead canManage={canManage} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell className={`${CELL} w-full max-w-0 whitespace-normal sm:px-5`}>
                <span className="flex items-center gap-3">
                  <span className="border-foreground/20 text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed">
                    <Letter aria-hidden="true" className="size-5" />
                  </span>
                  <span className="grid min-w-0 gap-0.5">
                    <BreakableEmail email={invitation.email} />
                    <span className="text-muted-foreground text-sm sm:hidden">
                      Enviado em {formatDate(invitation.sentAt)}
                    </span>
                  </span>
                </span>
              </TableCell>
              <TableCell className={`${CELL} text-muted-foreground hidden sm:table-cell`}>
                {formatDate(invitation.sentAt)}
              </TableCell>
              <CancelAction invitation={invitation} canManage={canManage} onCancel={onCancel} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

type CancelActionProps = {
  invitation: InvitationRow
  canManage: boolean
  onCancel: (invitation: InvitationRow) => Promise<void>
}

function CancelAction({ invitation, canManage, onCancel }: CancelActionProps): JSX.Element | null {
  if (canManage === false) {
    return null
  }

  return (
    <TableCell className={`${CELL} text-right sm:px-5`}>
      <CancelButton invitation={invitation} onCancel={onCancel} />
    </TableCell>
  )
}

/** Members see invitations but cannot cancel them, so their table has no actions column. */
function ActionsHead({ canManage }: { canManage: boolean }): JSX.Element | null {
  if (canManage === false) {
    return null
  }

  return (
    <TableHead className={`${HEAD} sm:px-5`}>
      <span className="sr-only">Ações</span>
    </TableHead>
  )
}

type CancelButtonProps = Omit<CancelActionProps, 'canManage'>

/** A trash icon on phones, the full label from `sm`, so the email keeps the width it needs. */
function CancelButton({ invitation, onCancel }: CancelButtonProps): JSX.Element {
  return (
    <ConfirmButton
      triggerLabel={`Cancelar o convite de ${invitation.email}`}
      title={`Cancelar o convite de ${invitation.email}?`}
      description="O link do email deixa de valer. Dá para convidar de novo depois."
      confirmLabel="Cancelar convite"
      cancelLabel="Manter convite"
      change={{ subject: invitation.email, icon: Letter, from: 'Pendente', to: 'Cancelado' }}
      isDestructive
      onConfirm={() => onCancel(invitation)}
    >
      <Trash aria-hidden="true" />
      <span className="hidden sm:inline">Cancelar convite</span>
    </ConfirmButton>
  )
}
