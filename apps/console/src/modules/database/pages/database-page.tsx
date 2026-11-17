import type { JSX } from 'react'

import { CreateTableDialog } from '@/modules/database/components/create-table-dialog'
import { TablesBrowser } from '@/modules/database/components/tables-browser'
import { useProjectId } from '@/shared/routing/use-project-id'
import { PageHeader } from '@/shared/ui/page-header'

export function DatabasePage(): JSX.Element {
  const projectId = useProjectId()

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Banco de dados"
        description="As tabelas do Postgres do projeto. Os apps leem e gravam pela API, dentro das políticas de cada tabela."
        actions={<CreateTableDialog projectId={projectId} />}
      />
      <TablesBrowser projectId={projectId} />
    </div>
  )
}
