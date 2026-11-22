import { Database } from 'lucide-react'
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
    <SettingsSection
      title="Excluir tabela"
      description="Apaga a tabela, as linhas e as políticas. Não dá para desfazer."
      isDanger
      footer={
        <ConfirmButton
          label="Excluir tabela"
          title={`Excluir a tabela ${table}?`}
          description="Todas as linhas são apagadas. Tabelas que apontam para ela impedem a exclusão."
          confirmLabel="Excluir tabela"
          change={{ subject: table, icon: Database, from: 'Tabela', to: 'Excluída' }}
          confirmationText={table}
          isDestructive
          isPending={drop.isPending}
          onConfirm={dropTable}
        />
      }
    />
  )
}
