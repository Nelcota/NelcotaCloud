import ShieldKeyhole from '~icons/solar/shield-keyhole-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import { useChangeRowLevelSecurityMutation } from '@/modules/database/queries/use-table-mutations'
import type { components } from '@/shared/api/api-schema'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { SwitchField } from '@/shared/ui/switch-field'

type TableOverview = components['schemas']['TableOverview']

type RowLevelSecuritySwitchProps = { projectId: string; table: TableOverview }

/** Turning it on is safe and immediate; turning it off opens every row, so it asks first. */
export function RowLevelSecuritySwitch({
  projectId,
  table,
}: RowLevelSecuritySwitchProps): JSX.Element {
  const [isConfirming, setIsConfirming] = useState(false)
  const change = useChangeRowLevelSecurityMutation(projectId)

  function toggle(isEnabled: boolean): void {
    if (isEnabled === false) {
      setIsConfirming(true)
      return
    }

    change.mutate({ table: table.name, isEnabled: true })
  }

  return (
    <div className="bg-card grid gap-3 rounded-xl border p-5">
      <SwitchField
        label="Row level security"
        description="Ligado, os apps só alcançam as linhas que as políticas abaixo liberam."
        checked={table.rls_enabled}
        onCheckedChange={toggle}
      />
      <ErrorAlert error={enablingError(change.error, change.variables?.isEnabled)} />
      <ConfirmDialog
        isOpen={isConfirming}
        onOpenChange={setIsConfirming}
        title={`Desligar row level security de ${table.name}?`}
        description="As políticas deixam de valer: todo pedido pela API, de visitantes (anon) ou de usuários logados, alcança todas as linhas."
        confirmLabel="Desligar RLS"
        change={{
          subject: table.name,
          icon: ShieldKeyhole,
          from: 'Protegida por políticas',
          to: 'Todas as linhas abertas',
        }}
        isDestructive
        onConfirm={() => change.mutateAsync({ table: table.name, isEnabled: false })}
      />
    </div>
  )
}

/** Turning it off shows its failure inside the dialog. */
function enablingError(error: Error | null, isEnabled: boolean | undefined): Error | null {
  if (isEnabled !== true) {
    return null
  }

  return error
}
