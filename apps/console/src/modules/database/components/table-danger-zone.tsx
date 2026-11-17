import Database from '~icons/solar/database-linear'
import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'

import { useDropTableMutation } from '@/modules/database/queries/use-table-mutations'
import { showFlash } from '@/shared/lib/flash-notice'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { SettingsSection } from '@/shared/ui/settings-section'

type TableDangerZoneProps = { projectId: string; table: string }

/** Drops the table, after its name is typed, then goes back to the list. */
export function TableDangerZone({ projectId, table }: TableDangerZoneProps): JSX.Element {
  const drop = useDropTableMutation(projectId)
  const navigate = useNavigate()

  async function dropTable(): Promise<void> {
    await drop.mutateAsync(table)
    showFlash(`Tabela excluída: ${table}`)
    await navigate({ to: '/projects/$projectId/database', params: { projectId } })
  }

  return (
    <SettingsSection title="Zona de perigo" tone="danger">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Excluir esta tabela</p>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            Apaga a tabela, as linhas e as políticas. Não dá para desfazer.
          </p>
        </div>
        <div className="shrink-0">
          <ConfirmButton
            title={`Excluir a tabela ${table}?`}
            description="Todas as linhas são apagadas. Tabelas que apontam para ela impedem a exclusão."
            confirmLabel="Excluir tabela"
            change={{ subject: table, icon: Database, from: 'Tabela', to: 'Excluída' }}
            confirmationText={table}
            isDestructive
            isPending={drop.isPending}
            onConfirm={dropTable}
          >
            Excluir tabela
          </ConfirmButton>
        </div>
      </div>
    </SettingsSection>
  )
}
