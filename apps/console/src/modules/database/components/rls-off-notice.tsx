import { ShieldCheck } from 'lucide-react'
import type { JSX } from 'react'

import { isRlsOff } from '@/modules/database/components/table-kinds'
import { useChangeRowLevelSecurityMutation } from '@/modules/database/queries/use-table-mutations'
import type { components } from '@/shared/api/api-schema'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { Notice } from '@/shared/ui/notice'
import { PendingButton } from '@/shared/ui/pending-button'

type TableOverview = components['schemas']['TableOverview']

type RlsOffNoticeProps = { projectId: string; table: TableOverview }

/** A table without RLS answers every app: the warning and the one click that closes it. */
export function RlsOffNotice({ projectId, table }: RlsOffNoticeProps): JSX.Element | null {
  const change = useChangeRowLevelSecurityMutation(projectId)

  if (isRlsOff(table) === false) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <Notice
        tone="warning"
        title="Row level security desativado"
        action={
          <PendingButton
            type="button"
            size="sm"
            isPending={change.isPending}
            onClick={() => change.mutate({ table: table.name, isEnabled: true })}
          >
            <ShieldCheck aria-hidden data-icon="inline-start" />
            Ativar RLS
          </PendingButton>
        }
      >
        Qualquer app com a publishable key lê e altera todas as linhas, com ou sem login.
      </Notice>
      <ErrorAlert error={change.error} />
    </div>
  )
}
